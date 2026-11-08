// The facts every page, markdown twin and agent file of whiteheap.com reads,
// so the homepage, /index.md, /agents.md, llms.txt and the WebMCP tools say
// the same thing. scripts/site.mjs holds the ones the check and deploy share.

export const ORIGIN = "https://whiteheap.com";

export const description =
  "Whiteheap builds open-source tools and infrastructure for agents, developers and security teams, all in Rust.";

// What public/og.png shows. Write it again when the screenshot is taken again.
export const ogImageAlt =
  "The top of whiteheap.com: “tools and infra for the agentic era” and “fast, secure and reliable”, beside a grid of white tiles that breaks into drifting particles.";

export interface ToolFacts {
  /** The tool's name, spelled as its repository spells it. */
  name: string;
  logo: string;
  /** The tool's GitHub repository description, split where its hero splits it. */
  title: string;
  lede: string;
  about: string;
  install: {
    command: string;
    script: string;
    note: string;
    alternative: { label: string; command: string };
  };
  website: string;
  repository: string;
  /** Where an agent reads the tool's own docs, as markdown. */
  llms: string;
  readme: string;
}

// Each claim matches residue's README (github.com/whiteheap/residue-cli).
export const residue: ToolFacts = {
  name: "residue",
  logo: "/tools/residue/logo-dark.svg",
  title: "Reclaim your storage from Git worktrees, automatically and safely.",
  lede: "residue removes a worktree only when nothing in it would be lost, whichever coding agent left it.",
  about: "One Rust binary with one dependency, for macOS, Linux and FreeBSD.",
  install: {
    command: "curl -fsSL https://residue.whiteheap.com/install.sh | sh",
    script: "https://residue.whiteheap.com/install.sh",
    note: "Installs residue, and on macOS and Linux turns on automatic cleanup.",
    alternative: {
      label: "Or with Homebrew alone:",
      command: "brew install whiteheap/tap/residue",
    },
  },
  website: "https://residue.whiteheap.com",
  repository: "https://github.com/whiteheap/residue-cli",
  llms: "https://residue.whiteheap.com/llms.txt",
  readme: "https://raw.githubusercontent.com/whiteheap/residue-cli/main/README.md",
};

export const tools: ToolFacts[] = [residue];

/** The hero's two lines. */
export const hero = { title: "tools and infra for the agentic era", note: "fast, secure and reliable" };

/** The homepage's prose, one string per paragraph: the HTML page and /index.md both render it. */
export const home = {
  mission: [
    "Agents now write code, run commands and hold credentials on real machines. Most of the tools around them were built for one person at a keyboard.",
    "They also run on a brittle stack: runtimes and package managers that have to line up, dependency trees nobody has read, install scripts piped straight into a shell. Every link in that chain runs with the agent's access.",
    "Whiteheap builds open-source tools and infrastructure for that shift: for the agents, for the developers who run them, and for the security teams who answer for what they do.",
    "We build all of it in Rust. The compiler rules out whole classes of memory bugs before anything ships. Each tool is one binary with no runtime to install and as few dependencies as we can manage. Every release carries SHA-256 checksums and a build-provenance attestation, so you can check that what you run is what we built.",
  ],
  standard: [
    "We want absolute excellence in software. Each tool we ship leaves your work alone whenever it cannot tell what is safe to touch, and says what it did in a few words. It uses as little CPU and memory as it can, and we measure both on each code change before it ships.",
  ],
  name: [
    "Whiteheap joins white hat and heap. A white hat is a hacker who finds weaknesses so they can be fixed, and works in the open. The heap is the memory a program asks for while it runs.",
  ],
};

/**
 * The agent skill each tool publishes at /.well-known/agent-skills/<name>/SKILL.md,
 * from src/skills/<name>.md. Its description starts "When to use:", as the
 * Agent Skills discovery index asks.
 */
export const skills = [
  {
    tool: residue,
    name: "residue",
    /** When src/skills/residue.md last changed in meaning. */
    updatedAt: "2026-11-08T00:00:00Z",
    description:
      "When to use: remove a Git worktree that a coding agent or you left behind, only when nothing in it would be lost, or check whether one is safe to remove, with residue on macOS, Linux or FreeBSD.",
    queries: [
      "remove this Git worktree only if nothing in it would be lost",
      "which of my Git worktrees are safe to delete",
      "clean up the worktree at the end of an agent task",
    ],
    /** What it is not for, as its README says. */
    notFor: "Not for creating worktrees or merging branches: Worktrunk (https://worktrunk.dev) does that. Not for Windows.",
  },
];

/** The pages written in markdown, in src/text/, each served as HTML and as /<slug>.md. */
export const textPages = {
  about: {
    heading: "about",
    title: "About Whiteheap",
    description:
      "Who builds Whiteheap, what it ships, and how each release can be checked: one Rust binary per tool, with SHA-256 checksums and a provenance attestation.",
  },
  contact: {
    heading: "contact",
    title: "Contact Whiteheap",
    description:
      "How to reach Whiteheap: issues for bugs and feature requests, private security advisories for vulnerabilities, and @whiteheaphq on X.",
  },
  privacy: {
    heading: "privacy",
    title: "Privacy at Whiteheap",
    description:
      "whiteheap.com sets no cookies and loads no analytics. What a visit sends to Cloudflare, which serves the site, and what residue keeps on your machine.",
  },
} as const;

export type TextPage = keyof typeof textPages;
