// /.well-known/agent-skills/<name>/SKILL.md: each tool's agent skill
// (agentskills.io). public/_headers serves *.md as text/markdown.
import type { APIRoute } from "astro";
import { servedSkills } from "../../../../skills/skills";

export function getStaticPaths() {
  return servedSkills.map((skill) => ({ params: { name: skill.name }, props: { text: skill.text } }));
}

export const GET: APIRoute = ({ props }) => new Response(props.text as string);
