# whiteheap.com

One static page. Astro builds it; React renders the Kumo components at build time and nothing hydrates in the browser. The client scripts are plain TypeScript in `src/scripts/`: the hero animation (`hero-field.ts`), each tool's hero art (`residue-stack.ts`) and the copy button beside each install command (`copy-button.ts`).

## Rules

- Keep the page static. Adding a `client:*` directive ships React's runtime (about 68 KB gzipped) for one component; avoid it unless the page truly needs interactivity.
- Use Kumo components (`@cloudflare/kumo`) and Phosphor icons. Kumo props differ from their names: `Code` takes `code="..."`, not children; `Link variant="current"` inherits the text color. Kumo's copy components (`ClipboardText`, `InlineCopyText`) need React in the browser, so the copy button is plain markup in `src/components/Tool.astro`, wired by `src/scripts/copy-button.ts`.
- The page is black and white. Do not add a color accent.
- The logo comes from `brand/` (the kit Trevor supplied; `brand/CLAUDE-HANDOFF.md` explains each file). Never redraw the mark. The header uses the textured mark as `public/logo-header.png`; the favicon stays the clean mark for legibility.
- Copy follows the Whiteheap [writing style](https://github.com/whiteheap/research/blob/main/standards/writing-style.md): the job first in plain, specific words, each tool in its own terms, and a warning before the action it qualifies. No emojis.
- A tool's one-line description is its GitHub repository description, word for word (`gh repo view whiteheap/<tool> --json description`). On the page it is the `title` and `lede` of the tool's `<Tool>`, split where the tool's own hero splits it. Change it there first, then here and in `public/llms.txt`.
- Each tool is one `<Tool>` in `src/pages/index.astro`: a compact copy of the hero on the tool's own site. Its mark is copied unchanged from the tool's repository into `public/tools/<tool>/`, the version for a dark background, because this page is dark only; never redraw it. Its art goes in the `hero` slot as its own component, and its install command is the one its README gives, word for word.
- Every claim about a tool must match that tool's own README.

## Verify a change

```sh
pnpm exec astro build
pnpm exec astro preview --port 4391
```

Open the preview at 1440x900 and at 390x844. Check for console errors: the Content Security Policy only applies to the built site, not to `astro dev`.

## Deploy

`pnpm run deploy` builds the site, uploads `dist/` to the Worker `whiteheap` (static assets only, custom domain whiteheap.com, set in `wrangler.jsonc`) and deploys the www redirect in `www/`. It needs `npx wrangler login` or a `CLOUDFLARE_API_TOKEN`. Keep the `whiteheap` Worker script-free: a script would run on every request, count toward Worker request limits, and stop `_headers` applying to the responses it returns.

## Astro

Run the dev server in the background with `astro dev --background`, and manage it with `astro dev stop`, `astro dev status` and `astro dev logs`. Docs: https://docs.astro.build
