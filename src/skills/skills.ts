// Each agent skill as served: its frontmatter, then its body from
// src/skills/<name>.md. The skill, the discovery index's digest and the ARD
// entry all read this, so the digest is always of the bytes served.
import { createHash } from "node:crypto";
import { skills } from "../site";

const bodies = import.meta.glob<string>("./*.md", { eager: true, query: "?raw", import: "default" });

export const skillUrl = (name: string) => `/.well-known/agent-skills/${name}/SKILL.md`;

export const servedSkills = skills.map((skill) => {
  const body = bodies[`./${skill.name}.md`];
  if (!body) throw new Error(`src/skills/${skill.name}.md is missing`);
  const text = `---\nname: ${skill.name}\ndescription: ${JSON.stringify(skill.description)}\n---\n\n${body.trim()}\n`;
  return { ...skill, text, digest: `sha256:${createHash("sha256").update(text).digest("hex")}` };
});
