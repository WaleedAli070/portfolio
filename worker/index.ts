// Play counter: anonymous per-day tallies in KV, no cookies or IDs.
// POST /api/play?game=deck|lander bumps a counter; GET /api/plays reads
// them back as JSON. Everything else falls through to the static assets.
// Minimal local types instead of @cloudflare/workers-types — the worker
// only touches this slice of the API.

interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl: number }): Promise<void>;
  list(opts: { prefix: string }): Promise<{ keys: { name: string }[] }>;
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  PLAYS: KV;
}

const GAMES = ["deck", "lander"] as const;
const DAY_KEY_TTL = 60 * 60 * 24 * 60; // daily keys expire after 60 days

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
