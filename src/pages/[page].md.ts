// /about.md, /contact.md and /privacy.md: each page as its markdown source,
// under frontmatter and the title the HTML page's head carries. public/_headers
// serves *.md as text/markdown.
import type { APIRoute } from "astro";
import { frontmatter } from "../agents";
import { textPage, textPageSlugs } from "../text/pages";
import { ORIGIN, type TextPage } from "../site";

export function getStaticPaths() {
  return textPageSlugs.map((page) => ({ params: { page } }));
}

export const GET: APIRoute = ({ params }) => {
  const page = textPage(params.page as TextPage);
  const head = frontmatter({ title: page.title, description: page.description, canonical: `${ORIGIN}/${page.slug}`, updated: page.updated });
  return new Response(`${head}# ${page.title}\n\n${page.markdown.trim()}\n`);
};
