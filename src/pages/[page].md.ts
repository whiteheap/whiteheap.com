// /about.md, /contact.md and /privacy.md: each page as its markdown source,
// under the title the HTML page's head carries. public/_headers serves *.md
// as text/markdown.
import type { APIRoute } from "astro";
import { textPage, textPageSlugs } from "../text/pages";
import type { TextPage } from "../site";

export function getStaticPaths() {
  return textPageSlugs.map((page) => ({ params: { page } }));
}

export const GET: APIRoute = ({ params }) => {
  const page = textPage(params.page as TextPage);
  return new Response(`# ${page.title}\n\n${page.markdown.trim()}\n`);
};
