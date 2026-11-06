# whiteheap.com

The Whiteheap website: one static page built with [Astro](https://astro.build), [Kumo](https://kumo-ui.com) and Tailwind CSS, served by Cloudflare as a Worker with static assets, the current form of Cloudflare Pages.

## Develop

```sh
pnpm install
pnpm dev
```

## Deploy

```sh
pnpm run deploy
```

This builds the site, uploads `dist/` to the Worker `whiteheap`, which serves https://whiteheap.com, and deploys the Worker `whiteheap-www`, which redirects www.whiteheap.com there. The `whiteheap` Worker has no script, so requests are served as static assets and do not count toward Worker request limits. Deploying needs `npx wrangler login`, or a `CLOUDFLARE_API_TOKEN` with Workers Scripts edit and Workers Routes edit permissions.

whiteheap.dev redirects to whiteheap.com through settings on its own Cloudflare zone, not through this repository.

## Where things are

| Path | What it holds |
| --- | --- |
| `src/pages/index.astro` | The page: copy, links and meta tags |
| `src/components/Hero.astro` | The hero: canvas, tagline and GitHub link |
| `src/scripts/hero-field.ts` | The hero animation: a grid of tiles that breaks into drifting particles, drawn in black and white on every display frame (60 Hz, 120 Hz or more where the browser allows), with all static work done once per size. It stops while off screen and draws one still frame for readers who prefer reduced motion. |
| `src/styles/global.css` | Tokens, reset and layout. Kumo's Tailwind styles are imported first. |
| `brand/` | The Whiteheap logo kit: clean and textured marks, the original X avatar, exports up to 4096 px, and `CLAUDE-HANDOFF.md`, which explains each file. |
| `public/logo-header.png` | The header mark: `brand/header-logo-textured.svg` rendered at 3x (123x96). The SVG is 449 KB of particles, too heavy for a 32 px logo. |
| `public/favicon.svg` | `brand/favicon.svg`: the clean mark, because grain turns to noise at 16-32 px. `public/apple-touch-icon.png` is the textured X avatar at 180 px. |
| `wrangler.jsonc` | The site Worker: the assets directory and the whiteheap.com custom domain |
| `www/` | The Worker that redirects www.whiteheap.com to whiteheap.com |
| `public/_headers` | Security and cache headers, applied by Cloudflare to every asset response. Astro adds the Content Security Policy as a `<meta>` tag at build time. |
| `public/og.png` | The 1200x630 social image: a screenshot of the top of the page. Take it again after changing the hero. |
| `public/llms.txt` | A plain-text summary for agents |

## License

MIT
