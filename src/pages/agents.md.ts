// /agents.md: when an agent should use each Whiteheap tool, and where to read more.
import type { APIRoute } from "astro";
import { agentsMarkdown } from "../agents";

export const GET: APIRoute = () => new Response(agentsMarkdown());
