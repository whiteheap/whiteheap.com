#!/usr/bin/env node
// `pnpm run deploy`: build whiteheap.com, deploy it, and announce to IndexNow
// only the pages whose HTML this deploy changed.
//
//   pnpm run deploy             build, deploy both Workers, announce, then run
//                               the live check (`pnpm run smoke`)
//   pnpm run deploy --dry-run   build, compare with whiteheap.com and run
//                               `wrangler deploy --dry-run` for both Workers;
//                               nothing is uploaded or announced
//
// A page is announced when its built HTML differs, byte for byte, from what
// whiteheap.com served just before the deploy, when it is new, or when it left
// the sitemap. A page that is unchanged, or whose live copy could not be read,
// is not. The announcement waits until whiteheap.com serves the new HTML, so a
// search engine that fetches the page at once gets the new one.
//
// Deploying needs `pnpm exec wrangler login` or a CLOUDFLARE_API_TOKEN.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { announce } from "./indexnow.mjs";
import { INDEXNOW_KEY, ORIGIN } from "./site.mjs";

const dryRun = process.argv.includes("--dry-run");
const root = fileURLToPath(new URL("../", import.meta.url));
const dist = new URL("../dist/", import.meta.url);
const USER_AGENT = "whiteheap.com deploy (+https://github.com/whiteheap/whiteheap.com)";
const WAIT_SECONDS = 60;
const KEY_FILE = `${ORIGIN}/${INDEXNOW_KEY}.txt`;
const problems = [];

/** Runs a command in the repository, showing its output. True if it succeeded. */
function run(command, ...args) {
  console.log(`\n$ ${[command, ...args].join(" ")}`);
  return spawnSync(command, args, { cwd: root, stdio: "inherit" }).status === 0;
}

function stop(message) {
  console.error(`\ndeploy: ${message}`);
  process.exit(1);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sitemapUrls = (xml) =>
  [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1].replaceAll("&amp;", "&"));

/** The built file of a page: index.html for /, a/index.html for /a/, a.html for /a. */
const builtFile = (url) => {
  const { pathname } = new URL(url);
  return new URL(`.${pathname.endsWith("/") ? `${pathname}index.html` : `${pathname}.html`}`, dist);
};

/**
 * What whiteheap.com serves at `url`: its body, `missing` for 404 or 410, or
 * why it is unknown. It asks for any type, never text/html: for a client that
 * accepts text/html, Cloudflare adds its Web Analytics script to the page, and
 * the bytes would never match the build.
 */
async function live(url) {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": USER_AGENT, accept: "*/*" },
    });
    if (response.status === 200) return { body: Buffer.from(await response.arrayBuffer()) };
    if (response.status === 404 || response.status === 410) return { missing: true };
    return { unknown: `status ${response.status}` };
  } catch (error) {
    return { unknown: error.cause?.code ?? error.message };
  }
}

// 1. Build. `pnpm run build` runs the site check after astro build.
if (!run("pnpm", "run", "build")) stop("the build or the site check failed. Nothing was deployed.");
const built = new Map();
for (const url of sitemapUrls(await readFile(new URL("sitemap.xml", dist), "utf8"))) {
  built.set(url, sha256(await readFile(builtFile(url))));
}

// 2. Compare with what whiteheap.com serves now, before the deploy replaces it.
const changed = [];
const unchanged = [];
const unknown = [];
for (const [url, hash] of built) {
  const page = await live(url);
  if (page.unknown) unknown.push(`${url} (${page.unknown})`);
  else if (page.missing || sha256(page.body) !== hash) changed.push(url);
  else unchanged.push(url);
}
const liveSitemap = await live(`${ORIGIN}/sitemap.xml`);
const removed = liveSitemap.body
  ? sitemapUrls(liveSitemap.body.toString("utf8")).filter((url) => !built.has(url))
  : [];
if (!liveSitemap.body) {
  unknown.push(`pages this deploy removes (live sitemap: ${liveSitemap.unknown ?? "missing"})`);
}
console.log("\nIndexNow, from the build compared with whiteheap.com before the deploy:");
for (const url of changed) console.log(`  announce  ${url}  its HTML changed`);
for (const url of removed) console.log(`  announce  ${url}  removed`);
for (const url of unchanged) console.log(`  skip      ${url}  unchanged`);
for (const item of unknown) console.log(`  skip      ${item}  could not compare`);

// 3. Deploy the site, then the Worker that redirects www to it.
const flags = dryRun ? ["--dry-run"] : [];
if (!run("pnpm", "exec", "wrangler", "deploy", ...flags)) {
  stop("deploying the site failed. Nothing was announced.");
}
if (!run("pnpm", "exec", "wrangler", "deploy", "--config", "www/wrangler.jsonc", ...flags)) {
  problems.push("deploying the www redirect failed (above)");
}

const toAnnounce = [...changed, ...removed];
const manually = `pnpm run indexnow ${toAnnounce.join(" ")}`;
if (dryRun) {
  console.log("\ndeploy: dry run. Nothing was uploaded or announced.");
} else if (toAnnounce.length === 0) {
  console.log("\nNo page changed, so nothing is announced.");
} else {
  // 4. Wait until whiteheap.com serves the new build: each changed page, each
  // removed page as a 404, and the key file IndexNow reads to trust the ping.
  const deadline = Date.now() + WAIT_SECONDS * 1000;
  let waiting = [];
  for (;;) {
    waiting = [];
    for (const url of changed) {
      const page = await live(url);
      if (!page.body || sha256(page.body) !== built.get(url)) waiting.push(url);
    }
    for (const url of removed) if (!(await live(url)).missing) waiting.push(url);
    if ((await live(KEY_FILE)).body?.toString("utf8").trim() !== INDEXNOW_KEY) waiting.push(KEY_FILE);
    if (waiting.length === 0 || Date.now() > deadline) break;
    await sleep(3000);
  }

  // 5. Announce.
  if (waiting.length > 0) {
    problems.push(
      `after ${WAIT_SECONDS} s whiteheap.com still does not serve the new build at ${waiting.join(" ")}, ` +
        `so nothing was announced. Once it does, run: ${manually}. If it never does, something ` +
        "rewrites the HTML on the way out (a Cloudflare feature such as Email Address Obfuscation), " +
        "and this byte-for-byte comparison has to change with it",
    );
  } else {
    try {
      const status = await announce(toAnnounce);
      console.log(`\nIndexNow: ${status}, announced ${toAnnounce.join(" ")}`);
    } catch (error) {
      problems.push(`IndexNow: ${error.message}. To announce again: ${manually}`);
    }
  }
}

// 6. Check the site as served.
if (!dryRun && !run("node", "scripts/check.mjs", "--live")) {
  problems.push("the live check failed (above). The deploy is live");
}

if (problems.length > 0) {
  console.error("\ndeploy: finished with problems:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`\ndeploy: ${dryRun ? "dry run passed" : "done"}`);
