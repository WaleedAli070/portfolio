// Minimal ambient declaration for the cloudflare:email runtime module,
// matching the local-types approach in index.ts (no @cloudflare/workers-types).
declare module "cloudflare:email" {
  export class EmailMessage {
    constructor(from: string, to: string, raw: string);
  }
}
