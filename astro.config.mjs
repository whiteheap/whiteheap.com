// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://whiteheap.com",
  integrations: [react()],
  // Hashes every processed script and style into a CSP <meta> at build time.
  security: { csp: true },
  vite: { plugins: [tailwindcss()] },
});
