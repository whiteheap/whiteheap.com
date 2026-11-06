# whiteheap.com

The Whiteheap website: one static page built with [Astro](https://astro.build), [Kumo](https://kumo-ui.com) and Tailwind CSS, served by Cloudflare Pages.

## Develop

```sh
pnpm install
pnpm dev
```

## Deploy

```sh
pnpm run deploy
```

This builds the site and uploads `dist/` to the Cloudflare Pages project `whiteheap`, which serves https://whiteheap.com. It needs `npx wrangler login`, or a `CLOUDFLARE_API_TOKEN` with Cloudflare Pages edit permission.

## Where things are

| Path | What it holds |
| --- | --- |
| `src/pages/index.astro` | The page: copy, links and meta tags |
| `src/components/Hero.astro` | The hero: canvas, tagline and GitHub link |
| `src/scripts/hero-field.ts` | The hero animation: a grid of tiles that breaks into drifting particles, drawn in black and white at 15 fps. It stops while off screen and draws one still frame for readers who prefer reduced motion. |
| `src/styles/global.css` | Tokens, reset and layout. Kumo's Tailwind styles are imported first. |
| `public/_headers` | Security and cache headers for Cloudflare Pages. Astro adds the Content Security Policy as a `<meta>` tag at build time. |
| `public/og.png` | The 1200x630 social image: a screenshot of the top of the page. Take it again after changing the hero. |
| `public/llms.txt` | A plain-text summary for agents |

## License

MIT
