# Portfolio (termfolio)

Waleed Ali's personal portfolio: a terminal/space-themed site with an
interactive canvas "flight deck" home and calm, readable content pages.

## Stack

- Astro + MDX, static output (no adapter)
- pnpm, single package (no workspace)
- Canvas games are **vanilla canvas — no game/animation libraries**
- Hosting: Cloudflare Workers static assets (`wrangler.jsonc`), free plan
  only — auto-deploys from `main` via Cloudflare's git integration.
  Static requests are unlimited; only worker routes (`/api/*` play
  counters, future contact form) count against the 100k/day free tier.

## Commands

- `pnpm dev` — dev server
- `pnpm build` — production build (run this to verify changes)
- `pnpm preview` — preview the build
- `pnpm deploy` — build + manual deploy via wrangler (needs `wrangler login`;
  normally unnecessary — pushes to `main` deploy automatically)

## Designs (`design/` — gitignored, never commit, never delete)

`design/` holds the design source of truth as interactive HTML mockups.
It is intentionally excluded from git. Before building any UI, open the
relevant file (see `.claude/skills/implementing-from-designs/`):

| Design file | Implements |
| --- | --- |
| `design/v2/design/Home.dc.html` | `/` — flight-deck canvas game (boot, ship, asteroids, nav nodes, lander, focus mode, idle autopilot + hints, planet descent, climb-out ascent) |
| `design/v2/design/Site.dc.html` | `/about`, `/projects`, `/blog`, `/blog/[slug]`, `/contact` |
| `design/Home.dc.html`, `design/Site.dc.html` | v1 — superseded by `design/v2/`, reference only |
| `design/uploads/portfolio.html` | earlier draft — superseded, reference only |

Design tokens: bg `#070b12` · text `#d7e2f0` · green `#34d399` ·
cyan `#22d3ee` · amber `#fbbf24` · violet `#a78bfa` · pink `#f472b6`.
Fonts: JetBrains Mono (body/UI), Space Grotesk (headings).

## Structure

- `src/pages/` — routes (the mockups' hash-nav becomes real routes here)
- `src/layouts/Base.astro` — bare HTML shell (fonts, global css, meta)
- `src/layouts/Site.astro` — terminal chrome for content pages (titlebar,
  nav tabs, status footer, starfield); the flight deck home composes
  `Base` directly
- `src/styles/global.css` — design tokens as CSS vars + keyframes; pages
  use scoped `<style>` referencing those vars
- `src/content/blog/` + `src/content.config.ts` — MDX blog collection
- `src/data/` — all real content: `site.ts` (identity/links),
  `career.ts` (bio/timeline/skills), `projects.ts` — content never lives
  in components
- SEO: `Base.astro` emits canonical + Open Graph/Twitter meta for every
  page (LinkedIn is the primary share target — `og:title` stays
  unsuffixed); `src/pages/og/[...slug].png.ts` renders a 1200×627
  terminal-styled share card per page/post at build (satori +
  @resvg/resvg-js, build-only deps; fonts vendored in
  `src/assets/fonts/`); `@astrojs/sitemap` + `public/robots.txt`;
  JSON-LD via `src/components/JsonLd.astro` (Person on `/` + `/about`,
  BlogPosting on posts). New posts get all of this for free from
  frontmatter
- `public/resume.pdf` — copy of the real resume; replace when it updates
- Interactivity is small vanilla `<script>` blocks per page (modals via
  native `<dialog>`, blog filters, mailto contact form — swap to a
  Cloudflare Function later)
- `src/scripts/flightdeck/` — the `/` canvas game as plain-TS modules
  (`background`/`deck`/`lander`/`particles` + controller in `index.ts`);
  `index.astro` owns all DOM (HUD, cards, boot, touch) and wires it via
  `createFlightDeck` callbacks. Sim runs fixed 60Hz steps regardless of
  display refresh rate. No-JS and `prefers-reduced-motion` visitors get
  the static `.fallback` layer; boot sequence plays once per tab session
  (`sessionStorage`)
- `worker/index.ts` — the Workers script behind `/api/*`: anonymous play
  counters (`POST /api/play`, `GET /api/plays`) in the `PLAYS` KV
  namespace. No cookies/IDs by design — keep it that way (no consent
  banner needed). `index.astro` fires the beacons (first control input =
  deck play, user-driven lander entry = lander play)
- Status: content pages and the `/` flight-deck game (deck + lander)
  match the design; play counters wired up; SEO + social share cards
  done; remaining: contact-form Cloudflare Function, more blog posts

## Principles

- Minimal: every file must have a purpose. No over-engineering, no
  speculative abstractions, no dependencies without a clear need.
- Keep this file and `.claude/skills/` updated as the project evolves —
  when conventions change or new workflows appear, record them.
