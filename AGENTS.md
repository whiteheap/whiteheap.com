# whiteheap.com

One static page. Astro builds it; React renders the Kumo components at build time and nothing hydrates in the browser. The only client script is the hero animation in `src/scripts/hero-field.ts`.

## Rules

- Keep the page static. Adding a `client:*` directive ships React's runtime (about 68 KB gzipped) for one component; avoid it unless the page truly needs interactivity.
- Use Kumo components (`@cloudflare/kumo`) and Phosphor icons. Kumo props differ from their names: `Code` takes `code="..."`, not children; `Link variant="current"` inherits the text color.
- The page is black and white. Do not add a color accent.
- Copy is plain and specific. No emojis.
- Every claim about a tool must match that tool's own README.

## Verify a change

```sh
pnpm exec astro build
pnpm exec astro preview --port 4391
```

Open the preview at 1440x900 and at 390x844. Check for console errors: the Content Security Policy only applies to the built site, not to `astro dev`.

## Deploy

`pnpm run deploy` uploads `dist/` to the Cloudflare Pages project `whiteheap`. It needs `npx wrangler login` or a `CLOUDFLARE_API_TOKEN`.

## Astro

Run the dev server in the background with `astro dev --background`, and manage it with `astro dev stop`, `astro dev status` and `astro dev logs`. Docs: https://docs.astro.build
