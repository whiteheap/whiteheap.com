# whiteheap.com

One static page, and a page for a missing address (`src/pages/404.astro`); both use the layout in `src/layouts/Page.astro`. Astro builds them; React renders the Kumo components at build time and nothing hydrates in the browser. The client scripts are plain TypeScript in `src/scripts/`: the hero animation (`hero-field.ts`), each tool's hero art (`residue-stack.ts`) and the copy button beside each install command (`copy-button.ts`).

## Rules

- Keep the page static. Adding a `client:*` directive ships React's runtime (about 68 KB gzipped) for one component; avoid it unless the page truly needs interactivity.
- Use Kumo components (`@cloudflare/kumo`) and Phosphor icons. Kumo props differ from their names: `Code` takes `code="..."`, not children; `Link variant="current"` inherits the text color. Kumo's copy components (`ClipboardText`, `InlineCopyText`) need React in the browser, so the copy button is plain markup in `src/components/Tool.astro`, wired by `src/scripts/copy-button.ts`.
- Pass a Phosphor icon to a Kumo `icon` prop as `decorative(Icon)`, from `src/components/decorative.ts`. Kumo renders a bare icon component with no props, so its SVG would reach screen readers.
- The page is black and white. Do not add a color accent.
- The logo comes from `brand/` (the kit Trevor supplied; `brand/CLAUDE-HANDOFF.md` explains each file). Never redraw the mark. The header uses the textured mark as `public/logo-header.png`; the favicon stays the clean mark for legibility.
- Copy follows the Whiteheap [writing style](https://github.com/whiteheap/research/blob/main/standards/writing-style.md): the job first in plain, specific words, each tool in its own terms, and a warning before the action it qualifies. No emojis.
- A tool's one-line description is its GitHub repository description, word for word (`gh repo view whiteheap/<tool> --json description`). On the page it is the `title` and `lede` of the tool's `<Tool>`, split where the tool's own hero splits it. Change it there first, then here and in `public/llms.txt`. The JSON-LD graph reads the same values, and the build fails until `public/llms.txt` matches.
- Each tool is one `<Tool>` in `src/pages/index.astro`: a compact copy of the hero on the tool's own site. Its mark is copied unchanged from the tool's repository into `public/tools/<tool>/`, the version for a dark background, because this page is dark only; never redraw it. Its art goes in the `hero` slot as its own component, and its install command is the one its README gives, word for word. Give a new tool a `SoftwareApplication` node in the JSON-LD graph in the same file, built from the same values as its `<Tool>`, as residue's is.
- Every claim about a tool must match that tool's own README.

## SEO

The site meets the Whiteheap [website SEO standard](https://github.com/whiteheap/research/issues/9), and `scripts/check.mjs` holds every build to it. When the check fails, fix the site; never loosen a check to pass.

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

`pnpm build` runs the site check after Astro, and must end with `site check: all N checks passed`. Open the preview at 1440x900 and at 390x844. Check for console errors: the Content Security Policy only applies to the built site, not to `astro dev`. `astro preview` does not apply `public/_headers`; `pnpm exec wrangler dev` serves `dist/` with those headers and with the 404 page's status, as Cloudflare does.

## Deploy

`pnpm run deploy` (`scripts/deploy.mjs`) builds and checks the site, compares each page's built HTML with whiteheap.com, uploads `dist/` to the Worker `whiteheap` (static assets only, custom domain whiteheap.com, set in `wrangler.jsonc`), deploys the www redirect in `www/`, announces the changed pages to IndexNow once they are live, and runs `pnpm run smoke`. `pnpm run deploy --dry-run` prints the pages it would announce and uploads nothing. A deploy needs `pnpm exec wrangler login` or a `CLOUDFLARE_API_TOKEN`. When it exits 1, it lists what is left to do.

Keep the `whiteheap` Worker script-free: a script would run on every request, count toward Worker request limits, and stop `_headers` applying to the responses it returns. HSTS is the whiteheap.com zone's HSTS setting (SSL/TLS > Edge Certificates), one setting for every subdomain, and `pnpm run smoke` checks it. Do not add `Strict-Transport-Security` to `_headers`: the zone's setting replaces it.

## Astro

Run the dev server in the background with `astro dev --background`, and manage it with `astro dev stop`, `astro dev status` and `astro dev logs`. Docs: https://docs.astro.build
