# whiteheap.com

The Whiteheap website: one static page built with [Astro](https://astro.build), [Kumo](https://kumo-ui.com) and Tailwind CSS, served by Cloudflare as a Worker with static assets, the current form of Cloudflare Pages. It meets the Whiteheap [website SEO standard](https://github.com/whiteheap/research/issues/9), and its build fails when it stops meeting it.

## Develop

```sh
pnpm install
pnpm dev
```

## Check

```sh
pnpm build
```

This builds `dist/`, then `scripts/check.mjs` reads it and prints every way it falls short of the standard: robots.txt, the sitemap against the pages, each page's title, description, canonical, Open Graph and Twitter tags, the 1200x630 `og:image` and its alt text, the icons, the landmarks, decorative drawings hidden from screen readers, the JSON-LD graph against what the page shows, llms.txt, security.txt, the IndexNow key file, the 404 page, and the headers in `public/_headers`. It also checks that every class on a page has a rule in its stylesheet, that the fonts hold every character a page draws (see "Fonts"), that every Astro island can hydrate, and that a page, stylesheet or script names each file in `dist/_astro/`, so the build ships nothing that no reader loads. A clean build ends with `site check: all N checks passed`. `pnpm run check` runs the check again without building.

`pnpm run smoke` runs the same checks against https://whiteheap.com as served, and adds each file's status and content type, HSTS, the 404 status, the www and http redirects, five crawlers' user agents, and a 200 with no redirect for every URL in the JSON-LD.

`pnpm exec wrangler dev` serves `dist/` the way Cloudflare does, with the headers from `public/_headers` and the 404 page with its status.

## Fonts

The pages use IBM Plex Mono 400 and 500, cut to printable ASCII and the copyright sign: 8.6 and 8.7 KB instead of the 14.7 and 14.9 KB latin files, 12.3 KB less to download on a first visit. `src/fonts/` holds the cut fonts and the font's SIL Open Font License, which names no Reserved Font Name, so the cut keeps the font's name. The build uses them as they are and needs no font tool.

A character the fonts lack would be drawn in another font, so `pnpm build` fails on one and names it:

```text
/: has U+2014 (—), which IBM Plex Mono 400 (/_astro/ibm-plex-mono-latin-400-normal.B5x82mTJ.woff2) lacks: write each in ASCII, or add each to UNICODES in scripts/fonts.mjs, run pnpm run fonts, then pnpm build
```

Write it in ASCII, or add it to the fonts:

1. Add its hex code to `UNICODES` in `scripts/fonts.mjs`.
2. Run `pnpm run fonts`. It needs `brew install harfbuzz woff2`, fetches `@fontsource/ibm-plex-mono` 5.3.0 from npm and checks its hashes, and keeps every table, hint and layout feature for the characters it keeps.
3. Run `pnpm build`, and commit the two fonts in `src/fonts/`.

## Deploy

```sh
pnpm run deploy --dry-run
pnpm run deploy
```

`pnpm run deploy`:

1. Builds and checks the site. A failed check stops it before anything is uploaded.
2. Compares each page's built HTML, byte for byte, with what whiteheap.com serves, and prints which pages it will announce: those that changed, are new, or left the sitemap.
3. Uploads `dist/` to the Worker `whiteheap`, which serves https://whiteheap.com, and deploys the Worker `whiteheap-www`, which redirects www.whiteheap.com there.
4. Waits until whiteheap.com serves the new HTML, then announces the changed pages through [IndexNow](https://www.indexnow.org) to Bing, Yandex and the other engines that read it. Google does not. An unchanged page is never announced.
5. Runs `pnpm run smoke`.

`--dry-run` stops after step 2 and a `wrangler deploy --dry-run` of both Workers: nothing is uploaded or announced. The deploy exits 1 when any step fails, and says what still needs doing. If it could not announce, it prints the command to do it by hand, `pnpm run indexnow <url> ...`. Give that command only URLs whose page changed.

Deploying needs `pnpm exec wrangler login`, or a `CLOUDFLARE_API_TOKEN` with Workers Scripts edit and Workers Routes edit permissions. The `whiteheap` Worker has no script, so requests are served as static assets and do not count toward Worker request limits.

HSTS comes from the whiteheap.com zone, not from this repository: its HSTS setting (SSL/TLS > Edge Certificates in the Cloudflare dashboard) sends `Strict-Transport-Security` with `includeSubDomains` for whiteheap.com and every subdomain, and replaces any such header in `public/_headers`. `pnpm run smoke` fails when the header is missing, lacks `includeSubDomains`, or has a max-age under 30 days.

whiteheap.dev redirects to whiteheap.com through settings on its own Cloudflare zone, not through this repository.

## Where things are

| Path | What it holds |
| --- | --- |
| `src/pages/index.astro` | The page: copy, links, meta tags and the JSON-LD graph, which takes each tool's name, description and website from the same values its card shows |
| `src/pages/404.astro` | The page for an address that does not exist, served with status 404. It is not in the sitemap and has no canonical. |
| `src/layouts/Page.astro` | What every page shares: the head basics, icons, header and footer. A page adds its own meta tags in the `head` slot. |
| `src/components/Hero.astro` | The hero: canvas, tagline and GitHub link |
| `src/scripts/hero-field.ts` | The hero animation: a grid of tiles that breaks into drifting particles, drawn in black and white at 30 frames a second, with all static work done once per size. It sleeps on a timer between frames, stops while off screen or in a hidden tab, and draws one still frame for readers who prefer reduced motion. |
| `src/components/Tool.astro` | One tool in the tools section, as a compact copy of its own site's hero: mark and name, art, title and lede, install command with a copy button, and links. Each tool is one `<Tool>`. |
| `src/components/ResidueStack.astro` | residue's art, for the `hero` slot of its `<Tool>`: a canvas that `src/scripts/residue-stack.ts` draws |
| `src/scripts/residue-stack.ts` | The residue art: a stack of sheets, one of which now and then loosens into dust while a new one gathers on top. A port of `site/public/hero.js` in whiteheap/residue at c49d1b4, with the frame scheduling of whiteheap/residue#87; change the two together. Like the hero, it stops while off screen and draws one still frame for readers who prefer reduced motion. |
| `src/scripts/copy-button.ts` | The copy button beside each install command. Without it the button stays hidden and one click still selects the whole command. |
| `src/components/decorative.ts` | `decorative(Icon)`: a Phosphor icon for a Kumo `icon` prop, hidden from screen readers |
| `src/styles/global.css` | Tokens, reset and layout. Kumo's Tailwind styles are imported first. |
| `src/styles/fonts.css`, `src/fonts/` | The two `@font-face` rules, and the fonts they load with their license: IBM Plex Mono 400 and 500, cut to the characters the pages draw (see "Fonts") |
| `brand/` | The Whiteheap logo kit: clean and textured marks, the original X avatar, exports up to 4096 px, and `CLAUDE-HANDOFF.md`, which explains each file. |
| `src/assets/logo-header.webp` | The header mark: `brand/header-logo-textured.svg` rendered at 3x (123x96), as a lossless WebP (4.7 KB; the same pixels as a PNG were 8.7 KB). The SVG is 449 KB of particles, too heavy for a 32 px logo. Imported by `Page.astro`, so its name carries a hash. |
| `public/favicon.svg` | `brand/favicon.svg`: the clean mark, because grain turns to noise at 16-32 px. `public/favicon-96.png` is the same mark as PNG for clients that skip SVG icons, rendered with `sips -s format png -z 96 96 brand/favicon.svg --out public/favicon-96.png`. `public/apple-touch-icon.png` is the textured X avatar at 180 px, and the Organization logo in the JSON-LD. |
| `public/tools/residue/logo-dark.svg` | residue's mark for a dark background, copied unchanged from `site/public/logo-dark.svg` in whiteheap/residue at c49d1b4 |
| `astro.config.mjs` | Astro's settings. React is registered for the build only: it renders the Kumo components into HTML, and its client runtime is never built. A component that must run in the browser needs `react()` registered instead. |
| `wrangler.jsonc` | The site Worker: the assets directory, the 404 page for unknown paths, and the whiteheap.com custom domain |
| `www/` | The Worker that redirects www.whiteheap.com to whiteheap.com |
| `public/_headers` | Security, cache and text-type headers, applied by Cloudflare to every asset response. Astro adds the Content Security Policy as a `<meta>` tag at build time. |
| `public/og.png` | The 1200x630 social image: a screenshot of the top of the page. Take it again after changing the hero, and rewrite `ogImageAlt` in `src/pages/index.astro` to say what it shows. |
| `public/robots.txt`, `public/sitemap.xml` | One group that lets every crawler in, and the list of pages. A new page goes in the sitemap, or the check fails. |
| `public/llms.txt` | A plain-text summary for agents, in the [llmstxt.org](https://llmstxt.org) format |
| `public/.well-known/security.txt` | How to report a vulnerability: privately, through GitHub, on the repository it concerns. The check fails once `Expires` is 30 days away or less; each year, set it 11 months ahead. |
| `public/70908b6d7e362f6f50b85609b145b9d3.txt` | The IndexNow key file. The key is public by design, and must equal `INDEXNOW_KEY` in `scripts/site.mjs`. |
| `scripts/check.mjs` | The site check behind `pnpm build`, `pnpm run check` and `pnpm run smoke` |
| `scripts/fonts.mjs`, `scripts/woff2.mjs` | `pnpm run fonts`, which cuts the fonts again, and the reader of which characters a WOFF2 font holds, which it and the check share |
| `scripts/deploy.mjs`, `scripts/indexnow.mjs` | `pnpm run deploy`, and the IndexNow announcement it makes |
| `scripts/site.mjs` | What the scripts share: the origin, the Organization `@id`, the IndexNow key and the shortest HSTS max-age the smoke check accepts |

## License

MIT
