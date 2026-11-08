// The markdown an agent reads about Whiteheap: the homepage's twin and
// /agents.md, both from the facts in src/site.ts that the HTML shows.
import { ORIGIN, description, hero, home, skills, tools, type ToolFacts } from "./site";
import { skillUrl } from "./skills/skills";

const paragraphs = (list: string[]) => list.join("\n\n");

/**
 * The frontmatter that opens each served markdown document, so an agent reads
 * its title, summary, canonical page and date without scraping. Values are
 * JSON strings, which YAML reads as quoted strings.
 */
export const frontmatter = (doc: { title: string; description: string; canonical: string; updated: string }) =>
  `---\ntitle: ${JSON.stringify(doc.title)}\ndescription: ${JSON.stringify(doc.description)}\ncanonical: ${doc.canonical}\nlast-updated: ${doc.updated}\n---\n\n`;

/** When /agents.md last changed in meaning. */
const agentsUpdated = "2026-11-08";

const toolSection = (tool: ToolFacts) => `### ${tool.name}

${tool.title} ${tool.lede} ${tool.about}

\`\`\`sh
${tool.install.command}
\`\`\`

${tool.install.note} ${tool.install.alternative.label} \`${tool.install.alternative.command}\`

- Website: ${tool.website}
- Source: ${tool.repository}
- Docs for agents: ${tool.llms}`;

/** /index.md: the homepage, section for section. */
export const homeMarkdown = () => `${frontmatter({ title: `Whiteheap · ${hero.title}`, description, canonical: `${ORIGIN}/`, updated: home.updated })}# Whiteheap: ${hero.title}

> ${description}

${hero.note}.

## Mission

${paragraphs(home.mission)}

## Standard

${paragraphs(home.standard)}

## Tools

${tools.map(toolSection).join("\n\n")}

## Name

${paragraphs(home.name)}

## More

- About: ${ORIGIN}/about
- Contact: ${ORIGIN}/contact
- Privacy: ${ORIGIN}/privacy
- For agents: ${ORIGIN}/agents.md
- GitHub: https://github.com/whiteheap
- X: https://x.com/whiteheaphq
`;

/** /agents.md: when to use each tool, how to install it, and where its docs and source are. */
export const agentsMarkdown = () => `${frontmatter({ title: "Whiteheap for agents", description: "When an agent should use each Whiteheap tool, how to install it, and where its docs and source are.", canonical: `${ORIGIN}/agents.md`, updated: agentsUpdated })}# Whiteheap for agents

> ${description}

This file is for an agent deciding whether to use a Whiteheap tool. Each tool is one binary with no runtime to install. Every release carries SHA-256 checksums and a GitHub build-provenance attestation.

## When to use

${skills.map((skill) => `- **${skill.tool.name}**: ${skill.description.replace(/^When to use: /, "")} ${skill.notFor}`).join("\n")}

## Install

${tools
  .map(
    (tool) =>
      `- **${tool.name}**: \`${tool.install.command}\`. ${tool.install.note} ${tool.install.alternative.label} \`${tool.install.alternative.command}\`. Read the script first: ${tool.install.script}`,
  )
  .join("\n")}

To check that a release file is what Whiteheap built: \`gh attestation verify <file> --repo whiteheap/<tool>\`.

## Docs

${tools
  .map(
    (tool) => `- ${tool.name}'s agent skill: ${ORIGIN}${skillUrl(tool.name)}
- ${tool.name}'s llms.txt, every doc as markdown: ${tool.llms}
- ${tool.name}'s README: ${tool.readme}`,
  )
  .join("\n")}

## Source

${tools.map((tool) => `- ${tool.name}: ${tool.repository}, under the MIT license`).join("\n")}
- Every Whiteheap repository, this website's included: https://github.com/whiteheap

## Discovery

- llms.txt: ${ORIGIN}/llms.txt
- Agent Skills index: ${ORIGIN}/.well-known/agent-skills/index.json
- ARD manifest: ${ORIGIN}/.well-known/ard.json
- The homepage as markdown: ${ORIGIN}/index.md
- Sitemap: ${ORIGIN}/sitemap.xml

## Contact

- Bugs and requests: an issue on the tool's repository. Details: ${ORIGIN}/contact
- A vulnerability: report it privately, as ${ORIGIN}/.well-known/security.txt says.
`;
