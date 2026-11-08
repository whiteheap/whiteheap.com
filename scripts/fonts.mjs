#!/usr/bin/env node
// Cuts IBM Plex Mono 400 and 500 to the characters in UNICODES and writes
// them to src/fonts/. Run it when `pnpm run check` says a page draws a
// character the fonts lack: add the character to UNICODES, then
// `pnpm run fonts` and `pnpm build`. The build never runs this script and
// needs none of its tools; the fonts it writes are committed.
//
// The source is the latin files of @fontsource/ibm-plex-mono 5.3.0, fetched
// from npm and pinned by SHA-256. For each character it keeps, HarfBuzz's
// hb-subset keeps every table, hint and layout feature, and the font keeps
// every name record; Google's woff2_compress writes the WOFF2. Needs tar,
// hb-subset (brew install harfbuzz), and woff2_compress and woff2_decompress
// (brew install woff2). The committed fonts were cut with HarfBuzz 12.3.0
// and woff2 at 7b67e12 with Brotli 1.2.1; other versions may write other
// bytes for the same characters, which the check reads either way.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { woff2Codepoints } from "./woff2.mjs";

/** The characters to keep, in hex as hb-subset reads them: printable ASCII and the copyright sign. */
const UNICODES = "20-7E,A9";
const VERSION = "5.3.0";
/** SHA-256 of each source file, by weight. */
const SOURCES = {
  400: "08949f728dc52d528e69b1667d15c89a5686a4ee9a296ff90983985f99c380f7",
  500: "01d285447409c8a588692162439a038b8cbd7871309ee20267b0d2d91c6e8e22",
};
const fonts = fileURLToPath(new URL("../src/fonts/", import.meta.url));

const hex = (codepoint) => `U+${codepoint.toString(16).toUpperCase().padStart(4, "0")}`;
const wanted = UNICODES.split(",").flatMap((part) => {
  const [start, end = start] = part.split("-").map((digits) => Number.parseInt(digits, 16));
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

/** Runs a tool, and names what to install when it is missing. */
function run(tool, args) {
  try {
    execFileSync(tool, args, { stdio: ["ignore", "ignore", "inherit"] });
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`needs ${tool}: brew install harfbuzz woff2`);
    throw new Error(`${tool} failed: ${error.message}`);
  }
}

const work = await mkdtemp(join(tmpdir(), "whiteheap-fonts-"));
try {
  const url = `https://registry.npmjs.org/@fontsource/ibm-plex-mono/-/ibm-plex-mono-${VERSION}.tgz`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  await writeFile(join(work, "package.tgz"), Buffer.from(await response.arrayBuffer()));
  const name = (weight) => `ibm-plex-mono-latin-${weight}-normal`;
  run("tar", ["-xzf", join(work, "package.tgz"), "-C", work, ...Object.keys(SOURCES).map((w) => `package/files/${name(w)}.woff2`)]);

  for (const [weight, sha256] of Object.entries(SOURCES)) {
    const source = join(work, "package/files", `${name(weight)}.woff2`);
    if (createHash("sha256").update(await readFile(source)).digest("hex") !== sha256) {
      throw new Error(`the ${weight} weight of @fontsource/ibm-plex-mono ${VERSION} is not the file its hash in scripts/fonts.mjs names`);
    }
    run("woff2_decompress", [source]);
    const cut = join(work, `${name(weight)}.ttf`);
    run("hb-subset", [`--unicodes=${UNICODES}`, "--name-IDs=*", `--output-file=${cut}`, source.replace(/\.woff2$/, ".ttf")]);
    run("woff2_compress", [cut]);
    const bytes = await readFile(join(work, `${name(weight)}.woff2`));
    // The font holds each character asked for: one the source lacks would
    // fail the site check after the build instead of here.
    const held = woff2Codepoints(bytes);
    const missing = wanted.filter((codepoint) => !held.has(codepoint));
    if (missing.length > 0) throw new Error(`IBM Plex Mono ${weight} has no glyph for ${missing.map(hex).join(", ")}`);
    await writeFile(join(fonts, `${name(weight)}.woff2`), bytes);
    console.log(`src/fonts/${name(weight)}.woff2: ${held.size} characters, ${bytes.length} bytes`);
  }
} catch (error) {
  console.error(`fonts: ${error.message}`);
  process.exitCode = 1;
} finally {
  await rm(work, { recursive: true, force: true });
}
