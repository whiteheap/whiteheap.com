// The Agentic Resource Discovery manifest (ARD v0.91, read with AI Catalog's
// specVersion and host): an entry for each tool's agent skill. Each entry's
// trustManifest names whiteheap.com, the publisher in its urn:air identifier,
// as ARD 4.5.1 requires. public/_headers names this file from / with rel="ard".
import type { APIRoute } from "astro";
import { ORIGIN } from "../../site";
import { servedSkills, skillUrl } from "../../skills/skills";

export const GET: APIRoute = () =>
  Response.json({
    specVersion: "1.0",
    host: {
      displayName: "Whiteheap",
      identifier: ORIGIN,
      documentationUrl: `${ORIGIN}/agents.md`,
      logoUrl: `${ORIGIN}/apple-touch-icon.png`,
    },
    entries: servedSkills.map((skill) => ({
      identifier: `urn:air:whiteheap.com:skill:${skill.name}`,
      displayName: `${skill.tool.name} agent skill`,
      type: 'text/markdown; profile="urn:air:agent-skills"',
      url: `${ORIGIN}${skillUrl(skill.name)}`,
      description: skill.description,
      tags: ["git", "worktrees", "coding-agents", "cli", "agent-skills"],
      updatedAt: skill.updatedAt,
      representativeQueries: skill.queries,
      metadata: {
        skillsIndexUrl: `${ORIGIN}/.well-known/agent-skills/index.json`,
        documentationUrl: skill.tool.llms,
        sourceUrl: skill.tool.repository,
        privacyPolicyUrl: `${ORIGIN}/privacy`,
      },
      trustManifest: {
        identity: ORIGIN,
        identityType: "https",
        // The skill's bytes are built from this website's repository.
        provenance: [{ relation: "publishedFrom", sourceId: "https://github.com/whiteheap/whiteheap.com" }],
      },
    })),
  });
