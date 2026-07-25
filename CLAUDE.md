# Portfolio (termfolio)

Waleed Ali's personal portfolio: a terminal/space-themed site with an
interactive canvas "flight deck" home and calm, readable content pages.

## Stack

- Astro + MDX, static output (no adapter)
- pnpm, single package (no workspace)
- Canvas games are **vanilla canvas — no game/animation libraries**
- Hosting: Cloudflare Workers static assets (`wrangler.jsonc`), free plan
  only — auto-deploys from `main` via Cloudflare's git integration.
  Static requests are unlimited; only future Functions (contact form)
  count against the 100k/day free tier.

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
|---|---|
| `design/Home.dc.html` | `/` — flight-deck canvas game (boot, ship, asteroids, nav nodes, lander) |
| `design/Site.dc.html` | `/about`, `/projects`, `/blog`, `/blog/[slug]`, `/contact` |
| `design/uploads/portfolio.html` | earlier draft — superseded, reference only |

Design tokens: bg `#070b12` · text `#d7e2f0` · green `#34d399` ·
cyan `#22d3ee` · amber `#fbbf24` · violet `#a78bfa` · pink `#f472b6`.
Fonts: JetBrains Mono (body/UI), Space Grotesk (headings).

## Structure

- `src/pages/` — routes (the mockups' hash-nav becomes real routes here)
- `src/layouts/Base.astro` — shared HTML shell
- `src/content/blog/` + `src/content.config.ts` — MDX blog collection
- `src/data/site.ts` — site-wide metadata (name, email, links)
- `TODO:` markers in content/data are placeholders awaiting real values

## Principles

- Minimal: every file must have a purpose. No over-engineering, no
  speculative abstractions, no dependencies without a clear need.
- Keep this file and `.claude/skills/` updated as the project evolves —
  when conventions change or new workflows appear, record them.
