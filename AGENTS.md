# whiteheap.com

One static page, and a page for a missing address (`src/pages/404.astro`); both use the layout in `src/layouts/Page.astro`. Astro builds them; React renders the Kumo components at build time and nothing hydrates in the browser. The client scripts are plain TypeScript in `src/scripts/`: the hero animation (`hero-field.ts`), residue's hero art (`residue-stack.ts`) and the copy button beside each install command (`copy-button.ts`). residue-ui's art is static markup with no script (`src/components/ResidueUiWindow.astro`).

## Rules

- Keep the page static. `astro.config.mjs` registers React for the build only, without its client runtime, so a `client:*` directive builds an island that never hydrates, and the site check fails on it. A component that truly needs interactivity needs `react()` registered there instead, which ships React's runtime (about 68 KB gzipped) to every reader.
- The fonts in `src/fonts/` hold printable ASCII and the copyright sign, and nothing else. A page that draws any other character, such as an em dash or a curly quote, fails the site check, which names the character. Write it in ASCII, or add it to `UNICODES` in `scripts/fonts.mjs`, run `pnpm run fonts` (it needs `brew install harfbuzz woff2`) and commit the fonts it writes.
- A reader's CPU and memory are scarce. A drawing that moves draws at most 30 frames a second, sleeps on a timer between frames, stops while off screen or in a hidden tab, and draws one still frame for reduced motion, as `src/scripts/hero-field.ts` does. Tailwind scans only `src/` and the Kumo chunks listed in `src/styles/global.css`; a page that renders another Kumo component adds its chunk there.
- Use Kumo components (`@cloudflare/kumo`) and Phosphor icons. Kumo props differ from their names: `Code` takes `code="..."`, not children; `Link variant="current"` inherits the text color. Kumo's copy components (`ClipboardText`, `InlineCopyText`) need React in the browser, so the copy button is plain markup in `src/components/Tool.astro`, wired by `src/scripts/copy-button.ts`.
- Pass a Phosphor icon to a Kumo `icon` prop as `decorative(Icon)`, from `src/components/decorative.ts`. Kumo renders a bare icon component with no props, so its SVG would reach screen readers.
- The page is black and white. Do not add a color accent.
- The logo comes from `brand/` (the kit Trevor supplied; `brand/CLAUDE-HANDOFF.md` explains each file). Never redraw the mark. The header uses the textured mark as `src/assets/logo-header.webp`, a lossless WebP of its 3x render; the favicon stays the clean mark for legibility.
- Copy follows the Whiteheap writing style: the job first in plain, specific words, each tool in its own terms, and a warning before the action it qualifies. No emojis.
- A tool's one-line description is its GitHub repository description, word for word (`gh repo view whiteheap/<tool> --json description`). On the page it is the `title` and `lede` of the tool's `<Tool>`, split where the tool's own hero splits it. Change it there first, then here and in `public/llms.txt`. The JSON-LD graph reads the same values, and the build fails until `public/llms.txt` matches.
- Each tool is one `<Tool>` in `src/pages/index.astro`: a compact copy of the hero on the tool's own site, or in its README when it has no site, as for residue-ui. Its mark is copied unchanged from the tool's repository into `public/tools/<tool>/`, the version for a dark background, because this page is dark only; never redraw it. A tool that shows another tool's mark, as residue-ui's app icon shows residue's on a tile, uses that tool's copy. Its art goes in the `hero` slot as its own component, and its install command is the one its README gives, word for word: a command of several lines keeps them, and each shows on its own line. A tool without a site leaves `website` and `llms` out of its facts in `src/site.ts` and is linked by its repository. Give a new tool a `SoftwareApplication` node in the JSON-LD graph in the same file, built from the same values as its `<Tool>`, as residue's is; its `url` is the tool's site, or its repository when it has none.
- Every claim about a tool must match that tool's own README.

## SEO

The site meets the Whiteheap website SEO standard, and `scripts/check.mjs` holds every build to it. This repository is public, so nothing in it links to a private one: the check fails on a link that does. When the check fails, fix the site; never loosen a check to pass.

- A new page needs a title that starts with `Whiteheap · ` and no other page has, a description of at most 160 characters in the words of its visible copy, and a canonical, Open Graph and Twitter tags in the `head` slot of `Page`. Its URL goes in `public/sitemap.xml`. Only the homepage carries JSON-LD.
- A new `public/og.png` needs a new `ogImageAlt` in `src/pages/index.astro` that says what the image shows.
- The build fails once `Expires` in `public/.well-known/security.txt` is 30 days away or less. Set it 11 months ahead.
- `public/robots.txt` keeps one `User-agent: *` group. A bot with its own group stops reading `*`.
- A sitemap `lastmod` comes only from a real content date, never from the build time.
- Only `pnpm run deploy` announces pages to IndexNow, and only those whose HTML changed. By hand, give `pnpm run indexnow` only URLs whose page changed.

## Verify a change

```sh
pnpm build
pnpm exec astro preview --port 4391
```

`pnpm build` runs the site check after Astro, and must end with `site check: all N checks passed`. Every pull request runs it too, in `.github/workflows/ci.yml`, and Dependabot proposes updates to the packages and the pinned actions once a week (`.github/dependabot.yml`). Open the preview at 1440x900 and at 390x844. Check for console errors: the Content Security Policy only applies to the built site, not to `astro dev`. `astro preview` does not apply `public/_headers`; `pnpm exec wrangler dev` serves `dist/` with those headers and with the 404 page's status, as Cloudflare does.

## Deploy

`pnpm run deploy` (`scripts/deploy.mjs`) builds and checks the site, compares each page's built HTML with whiteheap.com, uploads `dist/` to the Worker `whiteheap` (static assets only, custom domain whiteheap.com, set in `wrangler.jsonc`), deploys the www redirect in `www/`, announces the changed pages to IndexNow once they are live, and runs `pnpm run smoke`. `pnpm run deploy --dry-run` prints the pages it would announce and uploads nothing. A deploy needs `pnpm exec wrangler login` or a `CLOUDFLARE_API_TOKEN`. When it exits 1, it lists what is left to do.

Keep the `whiteheap` Worker script-free: a script would run on every request, count toward Worker request limits, and stop `_headers` applying to the responses it returns. HSTS is the whiteheap.com zone's HSTS setting (SSL/TLS > Edge Certificates), one setting for every subdomain, and `pnpm run smoke` checks it. Do not add `Strict-Transport-Security` to `_headers`: the zone's setting replaces it.

## Astro

Run the dev server in the background with `astro dev --background`, and manage it with `astro dev stop`, `astro dev status` and `astro dev logs`. Docs: https://docs.astro.build
