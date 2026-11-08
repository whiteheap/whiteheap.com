/**
 * WebMCP (webmachinelearning/webmcp, CG draft of 2026-11-02): two read-only
 * tools an agent in the browser can call on any page, from the same facts in
 * src/site.ts that the page shows. In a browser without
 * `document.modelContext` this does nothing; it loads and stores nothing.
 *
 * The spec puts the API on Document; it moved there from Navigator on
 * 2026-05-27 (webmcp PR #184), so this does not look on navigator.
 */
import { ORIGIN, tools } from "../site";

interface ModelContextTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

declare global {
  interface Document {
    modelContext?: { registerTool(tool: ModelContextTool): Promise<void> };
  }
}

const describe = (tool: (typeof tools)[number]) => ({
  name: tool.name,
  description: `${tool.title} ${tool.lede}`,
  about: tool.about,
  website: tool.website,
  repository: tool.repository,
  docs_for_agents: tool.llms,
  agent_skill: `${ORIGIN}/.well-known/agent-skills/${tool.name}/SKILL.md`,
});

const install = (tool: (typeof tools)[number]) => ({
  name: tool.name,
  command: tool.install.command,
  note: tool.install.note,
  script: tool.install.script,
  alternative: `${tool.install.alternative.label} ${tool.install.alternative.command}`,
  verify_a_release_file: `gh attestation verify <file> --repo whiteheap/${tool.name}`,
});

const register = (tool: ModelContextTool) => {
  if (!document.modelContext) return;
  document.modelContext.registerTool(tool).catch((error: unknown) => console.warn("[webmcp]", tool.name, error));
};

register({
  name: "list_whiteheap_tools",
  title: "List Whiteheap's tools",
  description:
    "Lists each open-source tool Whiteheap ships, with what it does, where it runs, its website, its source and the markdown docs and agent skill an agent should read before using it.",
  inputSchema: { type: "object", properties: {} },
  annotations: { readOnlyHint: true },
  execute: async () => ({ tools: tools.map(describe) }),
});

register({
  name: "get_install_command",
  title: "Get a Whiteheap tool's install command",
  description:
    "Returns the install command for one Whiteheap tool, what that command changes besides installing, the script it runs, the other way to install, and the command that checks a release file's build-provenance attestation.",
  inputSchema: {
    type: "object",
    properties: { tool: { type: "string", enum: tools.map((tool) => tool.name), description: "The tool's name." } },
    required: ["tool"],
  },
  annotations: { readOnlyHint: true },
  execute: async (input) => {
    const tool = tools.find((candidate) => candidate.name === input.tool);
    if (!tool) throw new Error(`No Whiteheap tool is named ${String(input.tool)}. Call list_whiteheap_tools.`);
    return install(tool);
  },
});
