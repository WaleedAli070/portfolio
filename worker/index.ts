// /api/* worker: anonymous play counters in KV plus the contact form.
// POST /api/play?game=deck|lander bumps a counter; GET /api/plays reads
// them back as JSON; POST /api/contact emails the message via the
// send_email binding (Email Routing). No cookies or IDs anywhere.
// Everything else falls through to the static assets.
// Minimal local types instead of @cloudflare/workers-types — the worker
// only touches this slice of the API.

import { EmailMessage } from "cloudflare:email";
import { createMimeMessage, Mailbox } from "mimetext/browser";

interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl: number }): Promise<void>;
  list(opts: { prefix: string }): Promise<{ keys: { name: string }[] }>;
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  PLAYS: KV;
  CONTACT_EMAIL: { send(message: EmailMessage): Promise<void> };
}

const GAMES = ["deck", "lander"] as const;
const DAY_KEY_TTL = 60 * 60 * 24 * 60; // daily keys expire after 60 days

// From must live on the Email Routing domain; the recipient must match a
// verified destination address (see the send_email binding in wrangler.jsonc).
const CONTACT_FROM = "contact@waleedali.dev";
const CONTACT_TO = "waleedali070@gmail.com";
const LIMITS = { name: 200, email: 320, subject: 200, message: 5000 } as const;

async function handleContact(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const field = (key: keyof typeof LIMITS) =>
    typeof body[key] === "string" ? (body[key] as string).trim().slice(0, LIMITS[key]) : "";
  const name = field("name");
  const email = field("email");
  const subject = field("subject") || "Message from waleedali.dev";
  const message = field("message");

  // Honeypot: bots fill the hidden "website" field — pretend it worked.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return new Response(null, { status: 204 });
  }
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "missing or invalid fields" }, { status: 400 });
  }

  const mime = createMimeMessage();
  mime.setSender({ name: `${name} via waleedali.dev`, addr: CONTACT_FROM });
  mime.setRecipient(CONTACT_TO);
  mime.setHeader("Reply-To", new Mailbox(email));
  mime.setSubject(subject);
  // Base64 body: the default 7bit transfer encoding can mangle non-ASCII text.
  mime.addMessage({
    contentType: "text/plain",
    encoding: "base64",
    data: mime.toBase64(`${message}\n\n— ${name} <${email}>`),
  });

  try {
    await env.CONTACT_EMAIL.send(new EmailMessage(CONTACT_FROM, CONTACT_TO, mime.asRaw()));
  } catch {
    return Response.json({ error: "send failed" }, { status: 502 });
  }
  return new Response(null, { status: 204 });
}

// KV read-modify-write isn't atomic; at portfolio traffic a lost
// increment is acceptable noise.
async function bump(kv: KV, key: string, ttl?: number): Promise<void> {
  const cur = parseInt((await kv.get(key)) ?? "0", 10);
  await kv.put(key, String(cur + 1), ttl ? { expirationTtl: ttl } : undefined);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/play" && request.method === "POST") {
      const game = url.searchParams.get("game") as (typeof GAMES)[number];
      if (!GAMES.includes(game)) return new Response(null, { status: 400 });
      const day = new Date().toISOString().slice(0, 10);
      await bump(env.PLAYS, `${game}:total`);
      await bump(env.PLAYS, `${game}:d:${day}`, DAY_KEY_TTL);
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }

    if (url.pathname === "/api/plays" && request.method === "GET") {
      const out: Record<string, { total: number; days: Record<string, number> }> = {};
      for (const game of GAMES) {
        const total = parseInt((await env.PLAYS.get(`${game}:total`)) ?? "0", 10);
        const days: Record<string, number> = {};
        const prefix = `${game}:d:`;
        for (const { name } of (await env.PLAYS.list({ prefix })).keys) {
          days[name.slice(prefix.length)] = parseInt((await env.PLAYS.get(name)) ?? "0", 10);
        }
        out[game] = { total, days };
      }
      return Response.json(out);
    }

    return env.ASSETS.fetch(request);
  },
};
