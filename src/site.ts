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

/**
 * A diagram in homepage prose: numbered steps, each a short label, a sentence
 * of markdown and the drawing beside it, a key into src/components/Flow.astro.
 * The steps are its text: the HTML lists them, and /index.md numbers them.
 */
export type Flow = { title: string; steps: { art: "task" | "pile" | "checks" | "removed"; label: string; text: string }[] };

/** A section of homepage prose: each block a paragraph, a list of items, or a diagram. */
export type Prose = (string | string[] | Flow)[];

/** residue's repository, which holds the evidence for most of the homepage's claims. */
const residueCli = "https://github.com/whiteheap/residue-cli";

/**
 * The homepage's prose, one string per paragraph, or an array of strings for a
 * list: the HTML page and /index.md both render it. Each string is markdown
 * with links and `code` only, as src/inline.ts reads it. Every claim links to
 * the README section, measurement or post that backs it; a claim with no
 * public evidence is cut, not softened.
 */
export const home: { updated: string; mission: Prose; standard: Prose; name: Prose } = {
  /** The day its words last changed: /index.md says it, and public/sitemap.xml has it as lastmod. */
  updated: "2026-11-10",
  mission: [
    "Agents now write code, run commands and hold credentials on real machines. Most developer tools were made for a person typing commands, not an agent running them.",
    "They also run on a brittle stack: runtimes and package managers that have to line up, dependency trees nobody has read, install scripts piped straight into a shell. Every link in that chain runs with the agent's access.",
    "Whiteheap builds open-source tools and infrastructure for that shift: for the agents, for the developers who run them, and for the security teams who answer for what they do. We build it as small tools, each doing one job well enough that an agent can run it unattended. The first two are residue, a command-line tool, and residue-ui, its Mac app, both for one job. More are coming.",
    `The first job is a mess agents leave on every machine they work on: Git worktrees. [Claude Code, Codex and Cursor](${residueCli}#where-it-fits) give each task its own worktree, a full checkout with its own \`node_modules\` and build output, and each sweeps only its own, Codex and Cursor by age and count. The rest pile up: [13 on one Mac, 11.6 GB of them in one repository](https://www.trevorlasn.com/blog/residue-cli-reclaim-storage-from-git-worktrees). Clearing them by hand is not safe either: [\`git worktree remove\` deletes ignored files such as \`.env\` without asking](${residueCli}#common-questions).`,
    `[residue](https://residue.whiteheap.com) removes a worktree only when nothing in it would be lost, whichever agent left it, and [residue-ui](https://github.com/whiteheap/residue-ui) shows the same checks in a Mac app. residue runs with no person watching: as a [login service](${residueCli}#automate-cleanup), under launchd or systemd, it removes a worktree once its branch has landed or when the disk runs low, and an agent runs [\`residue remove --yes --json\`](${residueCli}#for-coding-agents) as its last step, which exits 0 when the worktree is gone and 3 when it stays.`,
    {
      title: "How residue clears the worktrees agents leave",
      steps: [
        { art: "task", label: "task", text: "An agent gives each task its own worktree." },
        { art: "pile", label: "pile-up", text: "Each agent sweeps only its own, so the rest pile up." },
        { art: "checks", label: "15 checks", text: "residue checks each one. If any check fails, the worktree stays." },
        { art: "removed", label: "removed", text: "Git removes it without `--force`, and one command brings it back for 30 days." },
      ],
    },
    [
      `For agents: [an agent skill](https://whiteheap.com/.well-known/agent-skills/residue/SKILL.md) that tells Claude Code, Codex and other agents when to run residue, and an exit status that says whether the worktree is gone.`,
      `For developers: disk space back from the worktrees agents leave, taken only when [all 15 checks pass](${residueCli}#what-makes-a-worktree-a-candidate) and [restorable for 30 days](${residueCli}#restore-a-removed-worktree).`,
      `For security teams: [releases you can verify](${residueCli}/blob/main/docs/installation.md#release-archives-and-packages), an [install script you can read first](https://residue.whiteheap.com/install.sh), and a tool that [sends nothing off the machine](${residueCli}#common-questions) but its service's \`git fetch\` of your own remotes.`,
    ],
  ],
  standard: [
    "We want absolute excellence in software, so each claim here links to its proof.",
    `residue deletes a worktree only when [all 15 of its checks pass](${residueCli}#what-makes-a-worktree-a-candidate), lets Git do the delete without \`--force\`, and never deletes a branch or a commit. Each removal prints one line that ends with the command that [brings the worktree back, for 30 days](${residueCli}#restore-a-removed-worktree).`,
    `It is one Rust binary with one dependency, \`libc\`, and needs nothing installed but Git. We [measure the time, CPU and memory](${residueCli}/blob/main/CONTRIBUTING.md#performance) of every change that could slow it down: [on main](${residueCli}/blob/main/CONTRIBUTING.md#mains-numbers), \`residue scan\` of four worktrees took 0.32 to 0.35 s, and its service at rest spent under 0.01 s of CPU in five minutes.`,
    `You can [read residue's install script](https://residue.whiteheap.com/install.sh) before you run it, and check that a release is exactly what we built, because every release of [residue](${residueCli}/blob/main/docs/installation.md#release-archives-and-packages) and [residue-ui](https://github.com/whiteheap/residue-ui#check-a-download) carries SHA-256 checksums and a GitHub build-provenance attestation. [residue sends nothing off the machine](${residueCli}#common-questions) but its service's \`git fetch\` of your own remotes, which \`--no-fetch\` turns off.`,
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
