// The markdown pages in this folder (src/text), by slug. Each is rendered as HTML at
// /<slug> (src/pages/[page].astro) and served as written at /<slug>.md
// (src/pages/[page].md.ts), so the two never differ.
import type { MarkdownInstance } from "astro";
import { textPages, type TextPage } from "../site";

const files = import.meta.glob<MarkdownInstance<Record<string, never>>>("./*.md", { eager: true });

export function textPage(slug: TextPage) {
  const file = files[`./${slug}.md`];
  if (!file) throw new Error(`src/text/${slug}.md is missing`);
  return { ...textPages[slug], slug, Content: file.Content, markdown: file.rawContent() };
}

export const textPageSlugs = Object.keys(textPages) as TextPage[];
