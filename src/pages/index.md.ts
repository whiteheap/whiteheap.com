// /index.md: the homepage as markdown. public/_headers serves *.md as
// text/markdown and names it from / in a Link header.
import type { APIRoute } from "astro";
import { homeMarkdown } from "../agents";

export const GET: APIRoute = () => new Response(homeMarkdown());
