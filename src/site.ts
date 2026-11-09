// The facts every page, markdown twin and agent file of whiteheap.com reads,
// so the homepage, /index.md, /agents.md, llms.txt and the WebMCP tools say
// the same thing. scripts/site.mjs holds the ones the check and deploy share.

export const ORIGIN = "https://whiteheap.com";

export const description =
  "Whiteheap builds open-source tools and infrastructure for agents, developers and security teams.";

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
    /** Word for word from the README. A command of two lines, such as a download and then `open`, runs them in order. */
    command: string;
    /** The script the command runs, for a tool that installs with one. */
    script?: string;
    note: string;
    alternative?: { label: string; command: string };
  };
  /** The tool's own site, for a tool that has one. */
  website?: string;
  repository: string;
  /** Where an agent reads the tool's own docs, as markdown, for a tool whose site publishes them. */
  llms?: string;
  readme: string;
  /**
   * For a tool with no agent skill: who it is for, and which tool to use
   * instead, as "When to use" in /agents.md says. A tool with a skill says
   * this in the skill's description.
   */
  whenToUse?: string;
}

// Each claim matches residue's README (github.com/whiteheap/residue-cli).
// `satisfies` checks each tool against ToolFacts and keeps the fields it has,
// so the homepage can read residue.website without a check for undefined.
export const residue = {
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
} satisfies ToolFacts;

// Each claim matches residue-ui's README (github.com/whiteheap/residue-ui). It
// has no site, so its entry links its repository.
export const residueUi = {
  name: "residue-ui",
  // The app's icon is residue's mark on a tile, so the card uses the mark.
  logo: "/tools/residue/logo-dark.svg",
  title: "Reclaim your storage from Git worktrees, in a Mac app.",
  lede: "Every check, size and removal in its window comes from the residue CLI, and nothing moves to the trash until you confirm the plan residue shows.",
  about: "A Tauri app for macOS 13 or later, on Apple silicon or Intel, that needs nothing else: residue is inside.",
  install: {
    command:
      "curl -fLO https://github.com/whiteheap/residue-ui/releases/latest/download/residue-macos.dmg\nopen residue-macos.dmg",
    note: "Then drag residue to Applications. It is not notarized yet, so macOS may block the first launch: click Open Anyway in System Settings > Privacy & Security.",
  },
  repository: "https://github.com/whiteheap/residue-ui",
  readme: "https://raw.githubusercontent.com/whiteheap/residue-ui/main/README.md",
  whenToUse:
    "for a person on a Mac who wants to see the worktrees under their code folders and what keeps each one, and move the ones that can go to the trash with a click. In a terminal, on Linux or another Unix, or from a script or an agent's last step, use residue. Not for creating worktrees or merging branches.",
} satisfies ToolFacts;

export const tools: ToolFacts[] = [residue, residueUi];

/**
 * A tool's repository as `gh attestation verify --repo` takes it, such as
 * whiteheap/residue-cli. It is not always whiteheap/<name>: residue's is
 * residue-cli.
 */
export const repositoryName = (tool: ToolFacts) => new URL(tool.repository).pathname.slice(1);

/** The hero's two lines. */
export const hero = { title: "tools and infra for the agentic era", note: "fast, secure and reliable" };

/** The homepage's prose, one string per paragraph: the HTML page and /index.md both render it. */
export const home = {
  /** The day its words last changed: /index.md says it, and public/sitemap.xml has it as lastmod. */
  updated: "2026-11-09",
  mission: [
    "Agents now write code, run commands and hold credentials on real machines. Most developer tools were made for a person typing commands, not an agent running them.",
    "They also run on a brittle stack: runtimes and package managers that have to line up, dependency trees nobody has read, install scripts piped straight into a shell. Every link in that chain runs with the agent's access.",
    "Whiteheap builds open-source tools and infrastructure for that shift: for the agents, for the developers who run them, and for the security teams who answer for what they do.",
  ],
  standard: [
    "We want absolute excellence in software. Our tools never touch your work unless they're sure it's safe, and they tell you what they did in a few words. They're fast and light, and we measure that on every change. You can check that every release is exactly what we built.",
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

/** The pages written in markdown, in src/text/, each served as HTML and as /<slug>.md. `updated` is the day its words last changed, as its .md says and as public/sitemap.xml has it. */
export const textPages = {
  about: {
    heading: "about",
    updated: "2026-11-09",
    title: "About Whiteheap",
    description:
      "Who builds Whiteheap, what it ships, and how each release can be checked: SHA-256 checksums and a provenance attestation on every release.",
  },
  contact: {
    heading: "contact",
    updated: "2026-11-09",
    title: "Contact Whiteheap",
    description:
      "How to reach Whiteheap: issues for bugs and feature requests, private security advisories for vulnerabilities, and @whiteheaphq on X.",
  },
  privacy: {
    heading: "privacy",
    updated: "2026-11-09",
    title: "Privacy at Whiteheap",
    description:
      "whiteheap.com sets no cookies and loads no analytics. What a visit sends to Cloudflare, which serves the site, and what residue keeps on your machine.",
  },
} as const;

export type TextPage = keyof typeof textPages;
