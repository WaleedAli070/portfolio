# Personal Portfolio

A space and terminal-themed personal portfolio website for Waleed Ali. It features an interactive HTML5 Canvas home page ("Flight Deck") alongside fast, clean, content-focused pages for bio, projects, blog posts, and contact details.

## 🛠️ Tech Stack

- **Framework:** [Astro 5](https://astro.build/) + [MDX](https://mdxjs.com/)
- **Interactivity:** Vanilla JavaScript & HTML5 Canvas (zero external game libraries)
- **Styling:** Modular Vanilla CSS with design tokens
- **Deployment:** Cloudflare Workers Static Assets (`wrangler`)
- **Package Manager:** `pnpm`

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+) and `pnpm` installed.

### Installation

```bash
pnpm install
```

### Development Commands

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Starts local development server at `http://localhost:4321` |
| `pnpm build` | Builds static production assets to `./dist` |
| `pnpm preview` | Previews the local production build |
| `pnpm deploy` | Builds and deploys manually via Cloudflare Wrangler |

## 📁 Project Structure

```text
├── public/          # Static assets (images, resume PDF)
├── src/
│   ├── content/     # MDX blog posts and collections
│   ├── data/        # Static content data (site info, career, projects)
│   ├── layouts/     # Base shell & terminal UI layouts
│   ├── pages/       # Astro page routes (/about, /projects, /blog, /contact)
│   └── styles/      # Global CSS variables & design tokens
├── astro.config.mjs # Astro configuration
└── wrangler.jsonc   # Cloudflare Workers static deployment config
```

## 🌐 Deployment

The site is configured for automatic deployment via Cloudflare Workers Git integration whenever changes are pushed to `main`.
