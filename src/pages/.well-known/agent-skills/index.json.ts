// The Agent Skills discovery index (agentskills.io discovery 0.2.0): each
// skill's name, description, URL and the SHA-256 of the bytes served there.
import type { APIRoute } from "astro";
import { ORIGIN } from "../../../site";
import { servedSkills, skillUrl } from "../../../skills/skills";

export const GET: APIRoute = () =>
  Response.json({
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: servedSkills.map((skill) => ({
      name: skill.name,
      type: "skill-md",
      description: skill.description,
      url: `${ORIGIN}${skillUrl(skill.name)}`,
      digest: skill.digest,
    })),
  });
