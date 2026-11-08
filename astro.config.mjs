// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

/**
 * React for the build only. It renders the Kumo components into HTML, and no
 * page hydrates one. Astro builds every renderer's client entrypoint, used or
 * not (`getClientInput` in astro/dist/core/build/static-build.js, Astro
 * 7.4.7), so with `react()` alone dist/_astro/ held React's client runtime,
 * 220,749 bytes that no page loaded. This registers the same renderer
 * without its client entrypoint, which Astro's renderer API allows. A
 * `client:*` directive would then build an island that cannot hydrate, and
 * `pnpm run check` fails on it: give the renderer back with `react()`.
 * @returns {import("astro").AstroIntegration}
 */
function reactAtBuildTime() {
  const integration = react();
  const setup = integration.hooks["astro:config:setup"];
  if (!setup) throw new Error("@astrojs/react has no astro:config:setup hook to wrap");
  return {
    ...integration,
    hooks: {
      ...integration.hooks,
      "astro:config:setup": (options) =>
        setup({
          ...options,
          addRenderer: ({ clientEntrypoint, ...renderer }) => options.addRenderer(renderer),
        }),
    },
  };
}

export default defineConfig({
  site: "https://whiteheap.com",
  // /about builds about.html, served at /about with no trailing slash.
  build: { format: "file" },
  // Keep markdown's straight quotes and dashes: the fonts hold ASCII only.
  markdown: { smartypants: false },
  integrations: [reactAtBuildTime()],
  // Hashes every processed script and style into a CSP <meta> at build time.
  security: { csp: true },
  vite: { plugins: [tailwindcss()] },
});
