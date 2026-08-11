---
name: implementing-from-designs
description: Use when building or changing any page, component, style, or game on this site — maps routes to their design mockups in design/ and sets fidelity rules
---

# Implementing From Designs

The design source of truth lives in `design/` (gitignored — never commit
or delete it). Always open the relevant mockup before building UI.

## Route → design map

Current designs live in `design/v2/design/` (v1 files at the top of
`design/` are superseded — reference only). `design/v2/README.md` is the
full handoff doc: tokens, typography, and interaction specs.

| Route | Design | Notes |
|---|---|---|
| `/` | `design/v2/design/Home.dc.html` | Flight deck: boot sequence, flyable ship (WASD/arrows + space), asteroids, 5 nav nodes opening glass cards, lunar-lander mini-game, touch controls on coarse pointers. v2: focus mode (F / titlebar button / exit pill), idle autopilot + fading control hints until first input, flying into a planet irises into the lander, climbing off the top of the lander returns to space |
| `/about` | `design/v2/design/Site.dc.html` (`#about`) | Bio, career timeline, skills chips |
| `/projects` | `design/v2/design/Site.dc.html` (`#projects`) | Company (NDA-badged) + personal cards, detail modal |
| `/blog` | `design/v2/design/Site.dc.html` (`#blog`) | Post list, tag pills + year select filters |
| `/blog/[slug]` | `design/v2/design/Site.dc.html` (post view) | Rendered MDX article |
| `/contact` | `design/v2/design/Site.dc.html` (`#contact`) | Form + direct-channel links |

The mockups are single-page with hash routing; the real site uses one
Astro route per section. Shared terminal chrome (titlebar with traffic
lights, nav tabs, status footer) belongs in `src/layouts/Base.astro` or
components under `src/components/` — never duplicated per page.

## How to read the mockups

They are `.dc.html` files: static HTML with `{{ bindings }}` plus a
`<script type="text/x-dc">` class holding all logic and data. Inline
styles on elements are the design's exact values — reuse them. The
`data-props` JSON at the top of the script lists tunable game params
(asteroid count, thrust, lethality) worth keeping configurable.

## Rules

- Fidelity: match the mockups' colors, spacing, and typography (tokens
  in CLAUDE.md); adapt structure to Astro idioms rather than porting the
  `dc` runtime.
- Games are vanilla `<canvas>` in plain TS — no game/animation/physics
  libraries.
- Respect `reduceMotion` — mockups already model it; honor
  `prefers-reduced-motion`.
- Content (bio, projects, posts) comes from `src/data/` or
  `src/content/`, never hardcoded in components. Mockup content
  ("Alex Renner", fake projects) is placeholder — port structure, not
  the fake data.
