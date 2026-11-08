#!/usr/bin/env node
// Checks whiteheap.com against the Whiteheap website SEO standard
// (https://github.com/whiteheap/research/issues/9), and that each page's web
// fonts hold every character it may draw, that every island can hydrate,
// and, in dist/, that a page, stylesheet or script names every built asset.
// It prints every failure, not only the first, and exits 1 if there is one.
//
//   node scripts/check.mjs          the build in dist/. `pnpm build` runs it.
//   node scripts/check.mjs --live   https://whiteheap.com as served: the same
//                                   checks, then each file's status and type,
//                                   HSTS, the 404, the www and http redirects,
//                                   five crawlers, and every JSON-LD URL.

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parse, walkSync, TEXT_NODE } from "ultrahtml";
import { querySelector, querySelectorAll } from "ultrahtml/selector";
import { HSTS_MIN_MAX_AGE, INDEXNOW_KEY, ORGANIZATION_ID, ORIGIN } from "./site.mjs";
import { woff2Codepoints } from "./woff2.mjs";

const live = process.argv.includes("--live");
const HOME = `${ORIGIN}/`;
const BRAND = "Whiteheap · ";
const X_ACCOUNT = "@whiteheaphq";
const SAME_AS = ["https://github.com/whiteheap", "https://x.com/whiteheaphq"];
const USER_AGENT = "whiteheap.com site check (+https://github.com/whiteheap/whiteheap.com)";
// Each file the standard names, with the type it must be served as.
const TEXT = "text/plain; charset=utf-8";
const MARKDOWN = "text/markdown; charset=utf-8";
// The types public/_headers sets; Cloudflare gives every other file its own.
const DECLARED = [TEXT, MARKDOWN];
const FILES = [
  ["/", "text/html"],
  ["/robots.txt", TEXT],
  ["/sitemap.xml", "application/xml"],
  ["/llms.txt", TEXT],
  ["/agents.md", MARKDOWN],
  ["/index.md", MARKDOWN],
  ["/about.md", MARKDOWN],
  ["/.well-known/agent-skills/residue/SKILL.md", MARKDOWN],
  ["/.well-known/agent-skills/index.json", "application/json"],
  ["/.well-known/ard.json", "application/json"],
  ["/.well-known/security.txt", TEXT],
  [`/${INDEXNOW_KEY}.txt`, TEXT],
  ["/og.png", "image/png"],
  ["/favicon.svg", "image/svg+xml"],
  ["/favicon-96.png", "image/png"],
  ["/apple-touch-icon.png", "image/png"],
];
// Crawlers that must get through (standard item 6).
const CRAWLERS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-SearchBot/1.0; +https://www.anthropic.com",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
];

// ---------------------------------------------------------------- results

const failures = [];
let checks = 0;

/** Records a failure at `where` unless `ok`, and returns `ok`. */
function expect(ok, where, message) {
  checks += 1;
  if (!ok) failures.push(`${where}: ${message}`);
  return Boolean(ok);
}

// ---------------------------------------------------------------- reading

const dist = new URL("../dist/", import.meta.url);

/**
 * A file as a reader gets it: status, headers and bytes. From dist/ there is
 * no server, so a file is 200 with no headers and a missing one is 404.
 */
async function get(path, { userAgent = USER_AGENT } = {}) {
  if (live) {
    const response = await fetch(new URL(path, ORIGIN), {
      redirect: "manual",
      // Ask the way browsers and crawlers do. Cloudflare adds its Web Analytics
      // script to a page only for a client that accepts text/html.
      headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    return {
      status: response.status,
      headers: response.headers,
      body: Buffer.from(await response.arrayBuffer()),
    };
  }
  // As Cloudflare serves them: / is index.html, /about is about.html.
  const built = path.endsWith("/") ? `${path}index.html` : /\.[A-Za-z0-9]+$/.test(path) ? path : `${path}.html`;
  const file = new URL(`.${built}`, dist);
  try {
    return { status: 200, headers: new Headers(), body: await readFile(file) };
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "EISDIR") throw error;
    return { status: 404, headers: new Headers(), body: Buffer.alloc(0) };
  }
}

/** Reads `path` and records a failure unless it answers 200. */
async function getOk(path, where = path) {
  const file = await get(path);
  return expect(file.status === 200, where, `status ${file.status}, expected 200`) ? file : null;
}

const pathOf = (url) => {
  const { origin, pathname } = new URL(url, ORIGIN);
  return origin === ORIGIN ? pathname : null;
};

function pngSize(bytes) {
  const signature = bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  if (!signature || bytes.subarray(12, 16).toString("latin1") !== "IHDR") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

// ---------------------------------------------------------------- HTML

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", copy: "\u00a9" };
const decode = (text) =>
  text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, name) => {
    if (name[0] !== "#") return ENTITIES[name.toLowerCase()] ?? entity;
    const hex = name[1].toLowerCase() === "x";
    return String.fromCodePoint(Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10));
  });
const squash = (text) => text.replace(/\s+/g, " ").trim();

const all = (node, selector) => (node ? querySelectorAll(node, selector) : []);
const one = (node, selector) => (node ? querySelector(node, selector) : undefined);
const attr = (node, name) => {
  const value = node?.attributes?.[name];
  return value === undefined ? undefined : decode(value);
};
/** The content of each <meta> whose name or property is `key`. */
const metas = (doc, key) =>
  all(doc, "meta")
    .filter((node) => node.attributes.name === key || node.attributes.property === key)
    .map((node) => attr(node, "content") ?? "");
const links = (doc, rel) =>
  all(doc, "link").filter((node) => (attr(node, "rel") ?? "").split(/\s+/).includes(rel));

/** The text a reader sees in `node`: no script or style, entities decoded. */
function textOf(node) {
  const parts = [];
  walkSync(node, (child) => {
    if (child.type === TEXT_NODE && !["script", "style"].includes(child.parent?.name)) {
      parts.push(child.value);
    }
  });
  return squash(decode(parts.join(" ")));
}

const hiddenFromReaders = (node) => {
  for (let at = node; at; at = at.parent) {
    if (at.attributes?.["aria-hidden"] === "true") return true;
  }
  return false;
};

/** The head, landmarks and images every page needs, the 404 page included. */
async function checkDocument(where, doc) {
  expect(attr(one(doc, "html"), "lang") === "en", where, '<html> needs lang="en"');
  expect(
    all(doc, "meta").some((node) => (attr(node, "charset") ?? "").toLowerCase() === "utf-8"),
    where,
    "no <meta charset=utf-8>",
  );
  expect(metas(doc, "viewport").length === 1, where, "needs one viewport meta");
  expect(metas(doc, "theme-color").length === 1, where, "needs one theme-color meta");
  expect(
    metas(doc, "robots").every((value) => !/noindex|none/i.test(value)),
    where,
    "a robots meta says noindex; no public page may",
  );

  const titles = all(doc, "title").map(textOf);
  expect(titles.length === 1, where, `has ${titles.length} <title> elements, expected 1`);
  expect(titles[0]?.startsWith(BRAND), where, `title "${titles[0]}" must start with "${BRAND}"`);

  // Icons: SVG, a PNG fallback square in a multiple of 48 px, and the 180 px apple-touch-icon.
  const icons = links(doc, "icon");
  expect(
    icons.some((node) => attr(node, "type") === "image/svg+xml"),
    where,
    "no SVG icon (<link rel=icon type=image/svg+xml>)",
  );
  const pngIcon = icons.find((node) => attr(node, "type") === "image/png");
  if (expect(pngIcon, where, "no PNG icon fallback (<link rel=icon type=image/png>)")) {
    const file = await getOk(pathOf(attr(pngIcon, "href")) ?? "", `${where} PNG icon`);
    const size = file && pngSize(file.body);
    if (expect(size, `${where} PNG icon`, "is not a PNG")) {
      expect(
        size.width === size.height && size.width % 48 === 0,
        `${where} PNG icon`,
        `is ${size.width}x${size.height}; it must be square and a multiple of 48 px`,
      );
      expect(
        attr(pngIcon, "sizes") === `${size.width}x${size.height}`,
        `${where} PNG icon`,
        `sizes="${attr(pngIcon, "sizes")}" does not match the file, ${size.width}x${size.height}`,
      );
    }
  }
  const touch = links(doc, "apple-touch-icon")[0];
  expect(attr(touch, "href") === "/apple-touch-icon.png", where, "needs the apple-touch-icon link");

  // Landmarks.
  expect(all(doc, "h1").length === 1, where, `has ${all(doc, "h1").length} <h1>, expected 1`);
  expect(all(doc, "main").length === 1, where, `has ${all(doc, "main").length} <main>, expected 1`);
  expect(all(doc, "header").length > 0, where, "has no <header>");
  expect(all(doc, "footer").length > 0, where, "has no <footer>");
  const navs = all(doc, "nav");
  if (navs.length > 1) {
    const labels = navs.map((node) => attr(node, "aria-label") ?? attr(node, "aria-labelledby"));
    expect(
      labels.every(Boolean) && new Set(labels).size === labels.length,
      where,
      "with more than one <nav>, each needs its own aria-label",
    );
  }

  // Decorative drawings are hidden from screen readers; images say what they show.
  for (const canvas of all(doc, "canvas")) {
    expect(hiddenFromReaders(canvas), where, "a <canvas> is not aria-hidden");
  }
  for (const svg of all(doc, "svg")) {
    const named = attr(svg, "role") === "img" && (attr(svg, "aria-label") || attr(svg, "aria-labelledby"));
    expect(named || hiddenFromReaders(svg), where, "an inline <svg> is neither aria-hidden nor named");
  }
  for (const img of all(doc, "img")) {
    expect(attr(img, "alt") !== undefined, where, `<img src="${attr(img, "src")}"> has no alt`);
  }

  // An island hydrates through its renderer's client script. React renders
  // the pages at build time only (astro.config.mjs), so a client:* directive
  // builds an island with no renderer-url, which never hydrates.
  for (const island of all(doc, "astro-island")) {
    expect(
      attr(island, "renderer-url"),
      where,
      `<astro-island component-url="${attr(island, "component-url")}"> has no renderer-url, so it never hydrates; to hydrate a component, register react() in astro.config.mjs`,
    );
  }

  const css = await stylesheets(where, doc);
  checkStyled(where, doc, css);
  await checkFonts(where, doc, css);
  return titles[0];
}

/** The page's stylesheets, linked and inline, as one text. */
async function stylesheets(where, doc) {
  let css = "";
  for (const link of links(doc, "stylesheet")) {
    const path = pathOf(attr(link, "href") ?? "");
    const file = path && (await getOk(path, `${where} stylesheet`));
    if (file) css += file.body.toString("utf8");
  }
  for (const style of all(doc, "style")) css += style.children.map((child) => child.value ?? "").join("");
  return css;
}

/** A class as the stylesheet writes it in a selector: `gap-1.5` is `.gap-1\.5`. */
const classSelector = (name) => `.${name.replace(/[^A-Za-z0-9_-]/g, (c) => `\\${c}`)}`;

/**
 * Every class on the page has a rule in its stylesheets. Tailwind writes
 * rules only for the classes in the files src/styles/global.css lets it
 * scan, so a Kumo component missing from that list renders unstyled.
 */
function checkStyled(where, doc, css) {
  const names = new Set(all(doc, "[class]").flatMap((node) => (attr(node, "class") ?? "").split(/\s+/).filter(Boolean)));
  const unstyled = [...names].filter((name) => {
    const selector = classSelector(name);
    // The selector, not followed by more of a longer class name.
    for (let at = css.indexOf(selector); at !== -1; at = css.indexOf(selector, at + 1)) {
      if (!/[A-Za-z0-9_\\-]/.test(css[at + selector.length] ?? "")) return false;
    }
    return true;
  });
  expect(
    unstyled.length === 0,
    where,
    `no rule in the stylesheet for class ${unstyled.join(", ")}: add the Kumo component that renders it to the @source list in src/styles/global.css, or use a data- attribute for a script hook`,
  );
}

// ---------------------------------------------------------------- fonts

const describe = (codepoint) => `U+${codepoint.toString(16).toUpperCase().padStart(4, "0")} (${String.fromCodePoint(codepoint)})`;
const fromHex = (digits) => {
  const codepoint = Number.parseInt(digits, 16);
  return codepoint > 0 && codepoint <= 0x10ffff ? String.fromCodePoint(codepoint) : "�";
};
/** A script's text with its \u{...}, \uXXXX and \xXX escapes read. */
const scriptText = (text) => text.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi, (_, a, b, c) => fromHex(a ?? b ?? c));
/** A stylesheet's text with its \XXXXXX escapes read. */
const styleText = (text) => text.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, digits) => fromHex(digits));
// Whitespace a font draws nothing for: tab, line feed, form feed, carriage return.
const UNDRAWN = new Set([0x09, 0x0a, 0x0c, 0x0d]);
const scripts = new Map();

/** A same-origin script and each script it imports, by path, read once a run. */
async function scriptAndImports(path, where, found = new Map()) {
  if (!path || found.has(path)) return found;
  if (!scripts.has(path)) {
    const file = await getOk(path, `${where} script`);
    scripts.set(path, file ? file.body.toString("utf8") : "");
  }
  const text = scripts.get(path);
  found.set(path, text);
  for (const [, specifier] of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g)) {
    await scriptAndImports(pathOf(new URL(specifier, new URL(path, ORIGIN)).href), where, found);
  }
  return found;
}

/**
 * The characters a page may draw in a web font: its body text and its alt
 * and placeholder text, entities read; every character of its scripts,
 * inline, loaded and imported, escapes read, since a script may write any
 * string it holds; and every character of its stylesheets, for generated
 * content. The head is left out: a browser draws the title in its own font.
 */
async function pageCharacters(where, doc, css) {
  let text = styleText(css);
  const unknown = new Set();
  const read = (value) => {
    for (const [entity, name] of value.matchAll(/&([a-z][a-z0-9]*);/gi)) {
      if (!(name.toLowerCase() in ENTITIES)) unknown.add(entity);
    }
    return decode(value);
  };
  walkSync(one(doc, "body") ?? doc, (node) => {
    if (node.type === TEXT_NODE) {
      const parent = node.parent?.name;
      if (parent === "script" && attr(node.parent, "type") === "application/ld+json") return;
      text += parent === "script" ? scriptText(node.value) : parent === "style" ? styleText(node.value) : read(node.value);
    } else if (node.attributes) {
      for (const name of ["alt", "placeholder"]) {
        if (node.attributes[name] !== undefined) text += read(node.attributes[name]);
      }
    }
  });
  for (const script of all(doc, "script[src]")) {
    for (const source of (await scriptAndImports(pathOf(attr(script, "src")), where)).values()) text += scriptText(source);
  }
  const codepoints = new Set();
  for (const character of text) {
    const codepoint = character.codePointAt(0);
    if (!UNDRAWN.has(codepoint)) codepoints.add(codepoint);
  }
  return { codepoints, unknown: [...unknown] };
}

const fontCodepoints = new Map();

/**
 * Each web font the page loads holds every character the page may draw. The
 * fonts are cut to a few characters (scripts/fonts.mjs), and the browser
 * draws a character a font lacks in the next font of the stack.
 */
async function checkFonts(where, doc, css) {
  const { codepoints, unknown } = await pageCharacters(where, doc, css);
  expect(unknown.length === 0, where, `has ${unknown.join(", ")}, an entity this check cannot read: write the character, or its numeric entity`);
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, block]) => ({
    family: block.match(/font-family:\s*([^;]+)/)?.[1].trim().replace(/^["']|["']$/g, ""),
    weight: block.match(/font-weight:\s*([^;]+)/)?.[1].trim() ?? "400",
    url: block.match(/url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/)?.[1],
  }));
  expect(
    faces.length > 0 && faces.every((face) => face.url),
    where,
    "every @font-face needs a WOFF2 source, and there must be one: this check reads the fonts the page loads",
  );
  for (const face of faces.filter((f) => f.url)) {
    const path = pathOf(face.url);
    const font = `${face.family} ${face.weight} (${path})`;
    if (!fontCodepoints.has(path)) {
      const file = await getOk(path, `${where} font`);
      let held = null;
      try {
        held = file && woff2Codepoints(file.body);
      } catch (error) {
        expect(false, font, `cannot be read: ${error.message}`);
      }
      fontCodepoints.set(path, held);
    }
    const held = fontCodepoints.get(path);
    if (!held) continue;
    const missing = [...codepoints].filter((codepoint) => !held.has(codepoint)).sort((a, b) => a - b);
    expect(
      missing.length === 0,
      where,
      `has ${missing.map(describe).join(", ")}, which ${font} lacks: write each in ASCII, or add each to UNICODES in scripts/fonts.mjs, run pnpm run fonts, then pnpm build`,
    );
  }
}

const ogImageSizes = new Map();

/** A canonical page: its document, then the metadata a search or share result reads. */
async function checkPage(url) {
  const where = pathOf(url) ?? url;
  const file = await getOk(where);
  if (!file) return null;
  const doc = parse(file.body.toString("utf8"));
  const title = await checkDocument(where, doc);

  const [description] = metas(doc, "description");
  expect(description, where, "has no meta description");
  expect(
    !description || description.length <= 160,
    where,
    `the meta description is ${description?.length} characters; keep it to 160`,
  );
  const canonicals = links(doc, "canonical").map((node) => attr(node, "href"));
  expect(
    canonicals.length === 1 && canonicals[0] === url,
    where,
    `canonical is ${JSON.stringify(canonicals)}; it must be the sitemap URL, ${url}`,
  );

  // Open Graph and Twitter.
  const og = (key) => metas(doc, `og:${key}`)[0];
  expect(["website", "article"].includes(og("type")), where, "og:type must be website or article");
  expect(og("site_name") === "Whiteheap", where, 'og:site_name must be "Whiteheap"');
  expect(og("title"), where, "has no og:title");
  expect(og("description"), where, "has no og:description");
  expect(og("url") === url, where, `og:url is ${og("url")}; it must equal the canonical`);
  const image = og("image");
  if (expect(image?.startsWith(`${ORIGIN}/`) && image.endsWith(".png"), where, `og:image ${image} must be a PNG on ${ORIGIN}`)) {
    if (!ogImageSizes.has(image)) {
      const imageFile = await getOk(pathOf(image), `og:image ${image}`);
      ogImageSizes.set(image, imageFile && pngSize(imageFile.body));
    }
    const size = ogImageSizes.get(image);
    expect(
      size?.width === 1200 && size?.height === 630,
      `og:image ${image}`,
      `is ${size ? `${size.width}x${size.height}` : "not a PNG"}; it must be 1200x630`,
    );
  }
  expect(og("image:width") === "1200" && og("image:height") === "630", where, "og:image:width and height must be 1200 and 630");
  expect(og("image:alt"), where, "has no og:image:alt saying what the image shows");
  expect(metas(doc, "twitter:card")[0] === "summary_large_image", where, "twitter:card must be summary_large_image");
  expect(metas(doc, "twitter:site")[0] === X_ACCOUNT, where, `twitter:site must be ${X_ACCOUNT}`);
  expect(
    metas(doc, "twitter:image:alt")[0] === og("image:alt"),
    where,
    "twitter:image:alt must repeat og:image:alt",
  );

  const blocks = all(doc, "script").filter((node) => attr(node, "type") === "application/ld+json");
  return { url, title, doc, blocks };
}

// ---------------------------------------------------------------- JSON-LD

/** Every http(s) URL in a JSON-LD value, without fragments, except @context. */
function urlsIn(value, found = new Set()) {
  if (typeof value === "string" && /^https?:\/\//.test(value)) found.add(value.replace(/#.*$/, ""));
  else if (Array.isArray(value)) for (const item of value) urlsIn(item, found);
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) if (key !== "@context") urlsIn(item, found);
  }
  return found;
}

/** Every {"@id": ...} reference in a JSON-LD value. */
function references(value, found = []) {
  if (Array.isArray(value)) for (const item of value) references(item, found);
  else if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "@id") found.push(value["@id"]);
    else for (const item of Object.values(value)) references(item, found);
  }
  return found;
}

/** The homepage's one graph (standard item 15). Returns the URLs in it. */
async function checkJsonLd(page, llms) {
  const where = `${pathOf(page.url)} JSON-LD`;
  if (!expect(page.blocks.length === 1, where, `${page.blocks.length} blocks; the homepage has exactly one`)) {
    return [];
  }
  let data;
  try {
    // A script's text is raw: browsers and crawlers do not decode entities in it.
    data = JSON.parse(page.blocks[0].children.map((child) => child.value ?? "").join(""));
  } catch (error) {
    expect(false, where, `does not parse: ${error.message}`);
    return [];
  }
  expect(data["@context"] === "https://schema.org", where, '@context must be "https://schema.org"');
  const graph = data["@graph"];
  if (!expect(Array.isArray(graph), where, "has no @graph")) return [];

  const ofType = (type) => graph.filter((node) => node["@type"] === type);
  const visible = textOf(one(page.doc, "body"));
  const hrefs = new Set(
    all(page.doc, "a")
      .map((node) => attr(node, "href"))
      .filter(Boolean)
      .map((href) => new URL(href, ORIGIN).href),
  );
  const linked = (url) => hrefs.has(new URL(url).href);

  const organizations = ofType("Organization");
  const organization = organizations[0];
  expect(organizations.length === 1, where, `has ${organizations.length} Organization nodes, expected 1`);
  if (organization) {
    expect(organization["@id"] === ORGANIZATION_ID, where, `Organization @id must be ${ORGANIZATION_ID}`);
    expect(organization.name === "Whiteheap", where, 'Organization name must be "Whiteheap"');
    expect(organization.url === HOME, where, `Organization url must be ${HOME}`);
    const logo = organization.logo;
    if (expect(typeof logo === "string" && logo.startsWith(`${ORIGIN}/`) && logo.endsWith(".png"), where, "Organization logo must be a PNG URL on this site")) {
      const file = await getOk(pathOf(logo), `Organization logo ${logo}`);
      const size = file && pngSize(file.body);
      // Google reads a logo of at least 112x112.
      expect(size && size.width >= 112 && size.height >= 112, `Organization logo ${logo}`, "must be a PNG of at least 112x112");
    }
    for (const url of SAME_AS) {
      expect(organization.sameAs?.includes(url), where, `Organization sameAs must include ${url}`);
    }
    for (const url of organization.sameAs ?? []) {
      expect(linked(url), where, `Organization sameAs ${url} is not a link on the page`);
    }
  }

  const websites = ofType("WebSite");
  expect(websites.length === 1, where, `has ${websites.length} WebSite nodes, expected 1`);
  for (const website of websites) {
    expect(website.name === "Whiteheap" && website.url === HOME, where, `WebSite needs name "Whiteheap" and url ${HOME}`);
    expect(website.publisher?.["@id"] === ORGANIZATION_ID, where, `WebSite publisher must be {"@id": "${ORGANIZATION_ID}"}`);
  }

  // Each tool on the page, as its card shows it, and as llms.txt lists it.
  for (const app of ofType("SoftwareApplication")) {
    const name = `SoftwareApplication ${app.name ?? "(no name)"}`;
    for (const key of ["name", "description", "url", "operatingSystem"]) {
      expect(typeof app[key] === "string" && app[key].length > 0, where, `${name} has no ${key}`);
    }
    expect(app.applicationCategory === "DeveloperApplication", where, `${name} applicationCategory must be DeveloperApplication`);
    expect(String(app.offers?.price) === "0", where, `${name} offers must have price 0`);
    expect(app.publisher?.["@id"] === ORGANIZATION_ID, where, `${name} publisher must be {"@id": "${ORGANIZATION_ID}"}`);
    for (const key of ["aggregateRating", "review", "softwareVersion"]) {
      expect(!(key in app), where, `${name} must not carry ${key}`);
    }
    if (typeof app.description === "string" && typeof app.url === "string") {
      expect(visible.includes(app.name) && visible.includes(app.description), where, `${name}: its name and description must be visible on the page, word for word`);
      expect(linked(app.url), where, `${name}: its url ${app.url} must be a link on the page`);
      expect(llms.includes(app.description) && llms.includes(`(${app.url})`), "/llms.txt", `must list ${app.name} with the page's description and ${app.url}`);
    }
  }

  const ids = new Set(graph.map((node) => node["@id"]).filter(Boolean));
  for (const id of references(graph)) {
    expect(ids.has(id), where, `refers to ${id}, which no node in the graph has as its @id`);
  }
  const urls = [...urlsIn(graph)];
  for (const url of urls) {
    expect(url.startsWith("https://"), where, `${url} is not https`);
  }
  return urls;
}

// ---------------------------------------------------------------- files

async function checkRobots() {
  const file = await getOk("/robots.txt");
  if (!file) return;
  const lines = file.body
    .toString("utf8")
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean);
  const field = (name) =>
    lines
      .filter((line) => line.toLowerCase().startsWith(`${name}:`))
      .map((line) => line.slice(name.length + 1).trim());
  const agents = field("user-agent");
  expect(
    agents.length === 1 && agents[0] === "*",
    "/robots.txt",
    `User-agent lines are ${JSON.stringify(agents)}; keep one group, User-agent: *. A bot with its own group stops reading *`,
  );
  expect(field("allow").includes("/"), "/robots.txt", "needs Allow: /");
  expect(field("disallow").every((path) => path === ""), "/robots.txt", "must not disallow anything");
  const sitemaps = field("sitemap");
  expect(
    sitemaps.length === 1 && sitemaps[0] === `${ORIGIN}/sitemap.xml`,
    "/robots.txt",
    `Sitemap lines are ${JSON.stringify(sitemaps)}; keep exactly one, ${ORIGIN}/sitemap.xml`,
  );
}

/** The sitemap's URLs. A lastmod is allowed only as a real content date. */
async function checkSitemap() {
  const file = await getOk("/sitemap.xml");
  if (!file) return [];
  const xml = file.body.toString("utf8");
  expect(xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), "/sitemap.xml", "is not a sitemaps.org urlset");
  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => decode(match[1]));
  expect(urls.length > 0, "/sitemap.xml", "lists no URL");
  expect(new Set(urls).size === urls.length, "/sitemap.xml", "lists a URL twice");
  for (const url of urls) {
    expect(url.startsWith(`${ORIGIN}/`), "/sitemap.xml", `${url} is not on ${ORIGIN}`);
  }
  for (const [, date] of xml.matchAll(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/g)) {
    const time = Date.parse(date);
    expect(
      !Number.isNaN(time) && time <= Date.now(),
      "/sitemap.xml",
      `lastmod ${date} is not a past date; write a lastmod only from a real content date, never the build time`,
    );
  }
  return urls.filter((url) => url.startsWith(`${ORIGIN}/`));
}

/** The URL each built page is served at: index.html is its folder. */
async function builtPages() {
  const files = await readdir(dist, { recursive: true });
  return files
    .map((file) => file.split("\\").join("/"))
    .filter((file) => file.endsWith(".html") && file !== "404.html")
    .map((file) => `${ORIGIN}/${file.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "")}`);
}

/** The llms.txt contract of Lighthouse's agentic audit and of llmstxt.org. */
async function checkLlms() {
  const file = await getOk("/llms.txt");
  if (!file) return "";
  const text = file.body.toString("utf8");
  // Lighthouse (core/audits/agentic/llms-txt.js): an H1, a markdown link, 50 characters.
  expect(/^\s*#\s+.+/m.test(text), "/llms.txt", "has no H1");
  expect(/\[.+\]\(.+\)/.test(text), "/llms.txt", "has no markdown link");
  expect(text.length >= 50, "/llms.txt", "is under 50 characters");
  // llmstxt.org: the H1, a one-paragraph > summary, then sections of links.
  const [heading, summary] = text.split(/\n\s*\n/);
  expect(/^# \S/.test(heading ?? "") && !heading.includes("\n"), "/llms.txt", "must open with its H1 alone");
  expect(/^> \S/.test(summary ?? "") && !summary.includes("\n"), "/llms.txt", "the H1 must be followed by a one-paragraph > summary");
  const sections = [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1].trim().toLowerCase());
  for (const section of ["install", "docs", "source"]) {
    expect(sections.includes(section), "/llms.txt", `has no "## ${section[0].toUpperCase()}${section.slice(1)}" section of links`);
  }
  for (const [, url] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    expect(url.startsWith("https://"), "/llms.txt", `links to ${url}; links are absolute https URLs`);
  }
  return text;
}

/** RFC 9116, with Expires more than 30 days and at most a year away. */
async function checkSecurityTxt() {
  const where = "/.well-known/security.txt";
  const file = await getOk(where);
  if (!file) return;
  const fields = file.body
    .toString("utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => line.match(/^([A-Za-z-]+):\s*(.+)$/))
    .filter(Boolean)
    .map(([, name, value]) => [name.toLowerCase(), value.trim()]);
  const values = (name) => fields.filter(([key]) => key === name).map(([, value]) => value);

  const contacts = values("contact");
  expect(contacts.length > 0, where, "has no Contact");
  for (const contact of contacts) {
    expect(/^(https:|mailto:|tel:)/.test(contact), where, `Contact ${contact} must be an https, mailto or tel URI`);
  }
  const expires = values("expires");
  if (expect(expires.length === 1, where, `has ${expires.length} Expires fields, expected 1`)) {
    const [value] = expires;
    const days = (Date.parse(value) - Date.now()) / 86_400_000;
    expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value), where, `Expires ${value} is not an RFC 3339 date-time`);
    expect(days > 30, where, `Expires ${value} is ${Math.floor(days)} days away; set it 11 months ahead`);
    expect(days <= 366, where, `Expires ${value} is more than a year away`);
  }
  expect(
    values("preferred-languages").some((value) => value.split(",").map((tag) => tag.trim()).includes("en")),
    where,
    "needs Preferred-Languages: en",
  );
  expect(values("canonical").includes(`${ORIGIN}${where}`), where, `needs Canonical: ${ORIGIN}${where}`);
}

async function checkIndexNowKey() {
  expect(/^[A-Za-z0-9-]{8,128}$/.test(INDEXNOW_KEY), "scripts/site.mjs", "INDEXNOW_KEY must be 8 to 128 letters, digits or dashes");
  const file = await getOk(`/${INDEXNOW_KEY}.txt`, "IndexNow key file");
  if (file) {
    expect(file.body.toString("utf8").trim() === INDEXNOW_KEY, `/${INDEXNOW_KEY}.txt`, "must hold INDEXNOW_KEY from scripts/site.mjs");
  }
}

// ---------------------------------------------------------------- headers

/** The rules in public/_headers: a path pattern and its header lines. */
function parseHeadersFile(text) {
  const rules = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: [] });
      continue;
    }
    const match = line.trim().match(/^([^:]+):\s*(.*)$/);
    if (match && rules.length > 0) rules.at(-1).headers.push([match[1].trim().toLowerCase(), match[2].trim()]);
  }
  return rules;
}

/** Cloudflare's matching: one * splat matches anything, :name one segment. */
const matches = (pattern, path) =>
  new RegExp(
    `^${pattern
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/:[A-Za-z]\w*/g, "[^/]+"))
      .join(".*")}$`,
  ).test(path);

/** The headers _headers gives `path`, each name with every value set for it. */
const declared = (rules, path) => {
  const headers = new Map();
  for (const rule of rules.filter((rule) => matches(rule.pattern, path))) {
    for (const [name, value] of rule.headers) headers.set(name, [...(headers.get(name) ?? []), value]);
  }
  return headers;
};

/** In dist/: the headers public/_headers declares. Cloudflare joins repeats with commas. */
async function checkDeclaredHeaders() {
  const rules = parseHeadersFile((await readFile(new URL("_headers", dist), "utf8")));
  for (const [path, type] of FILES) {
    const types = declared(rules, path).get("content-type") ?? [];
    if (DECLARED.includes(type)) {
      expect(types.length === 1 && types[0] === type, "_headers", `${path} needs exactly one Content-Type: ${type}`);
    } else {
      expect(types.length === 0, "_headers", `${path} keeps the type Cloudflare gives it; do not set one`);
    }
  }
  for (const rule of rules) {
    expect(!rule.headers.some(([name]) => name === "x-robots-tag"), "_headers", `${rule.pattern} sets X-Robots-Tag; no public page may carry one`);
  }
  // Without this, an unknown path is an empty 404 instead of dist/404.html.
  const wrangler = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  expect(/"not_found_handling"\s*:\s*"404-page"/.test(wrangler), "wrangler.jsonc", 'assets need "not_found_handling": "404-page"');
}

/**
 * In dist/: another built file names each file in _astro/, so the build
 * ships nothing that no reader loads. Astro builds every renderer's client
 * entrypoint, used or not: React's was 220,749 bytes no page asked for.
 */
async function checkBuiltAssets() {
  const files = (await readdir(dist, { recursive: true })).map((file) => file.split("\\").join("/"));
  const texts = [];
  for (const file of files.filter((name) => /\.(html|css|js|mjs|json|xml|txt|svg)$/.test(name) || name === "_headers")) {
    texts.push([file, await readFile(new URL(file, dist), "utf8")]);
  }
  for (const file of files.filter((name) => name.startsWith("_astro/"))) {
    const name = file.slice("_astro/".length);
    expect(
      texts.some(([other, text]) => other !== file && text.includes(name)),
      `dist/${file}`,
      "no page, stylesheet or script names it, so no reader loads it: find what emits it and stop it",
    );
  }
}

// ---------------------------------------------------------------- live only

const typeOf = (file) => (file.headers.get("content-type") ?? "").toLowerCase().replace(/\s+/g, "");

/** Each file's status and type, HSTS, no X-Robots-Tag (standard items 5, 19, 25). */
async function checkServed() {
  for (const [path, type] of FILES) {
    const file = await get(path);
    expect(file.status === 200, path, `status ${file.status}, expected 200`);
    const served = typeOf(file);
    const wanted = type.toLowerCase().replace(/\s+/g, "");
    expect(
      DECLARED.includes(type) ? served === wanted : served === wanted || served.startsWith(`${wanted};`),
      path,
      `served as "${file.headers.get("content-type")}", expected "${type}"`,
    );
    expect(!file.headers.has("x-robots-tag"), path, "carries an X-Robots-Tag header");
  }
  // HSTS comes from the whiteheap.com zone's HSTS setting (SSL/TLS > Edge
  // Certificates), which covers every subdomain, not from public/_headers.
  const hsts = (await get("/")).headers.get("strict-transport-security");
  const owner = "the whiteheap.com zone's HSTS setting (SSL/TLS > Edge Certificates) sends it";
  if (expect(hsts, "/", `has no Strict-Transport-Security header; ${owner}`)) {
    const maxAge = Number(hsts.match(/(?:^|;)\s*max-age\s*=\s*"?(\d+)"?\s*(?:;|$)/i)?.[1] ?? Number.NaN);
    expect(maxAge >= HSTS_MIN_MAX_AGE, "/", `Strict-Transport-Security "${hsts}" needs a max-age of at least ${HSTS_MIN_MAX_AGE}; ${owner}`);
    expect(/(?:^|;)\s*includeSubDomains\s*(?:;|$)/i.test(hsts), "/", `Strict-Transport-Security "${hsts}" needs includeSubDomains; ${owner}`);
  }
}

/** An unknown path is a 404 with the helpful page, not a soft 404. */
async function checkMissingPage() {
  const where = "/this-page-does-not-exist";
  const file = await get(where);
  expect(file.status === 404, where, `status ${file.status}, expected 404`);
  expect(typeOf(file).startsWith("text/html"), where, `served as "${file.headers.get("content-type")}", expected text/html`);
  return file;
}

async function checkRedirects() {
  const cases = [
    ["https://www.whiteheap.com/robots.txt?from=check", `${ORIGIN}/robots.txt?from=check`],
    ["http://whiteheap.com/robots.txt", `${ORIGIN}/robots.txt`],
  ];
  for (const [from, to] of cases) {
    const response = await fetch(from, { redirect: "manual", headers: { "user-agent": USER_AGENT } });
    expect(
      response.status === 301 && response.headers.get("location") === to,
      from,
      `answers ${response.status} to ${response.headers.get("location")}; expected 301 to ${to}`,
    );
  }
}

async function checkCrawlers() {
  const requests = CRAWLERS.flatMap((userAgent) =>
    ["/", "/robots.txt", "/sitemap.xml", "/llms.txt"].map(async (path) => {
      const bot = userAgent.match(/(Googlebot|bingbot|OAI-SearchBot|Claude-SearchBot|PerplexityBot)\/[\d.]+/)[0];
      const file = await get(path, { userAgent });
      expect(file.status === 200, `${path} as ${bot}`, `status ${file.status}, expected 200`);
    }),
  );
  await Promise.all(requests);
}

/** Every URL in the JSON-LD answers 200, with no redirect. */
async function checkJsonLdUrls(urls) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { redirect: "manual", headers: { "user-agent": USER_AGENT } });
        expect(response.status === 200, `JSON-LD URL ${url}`, `answers ${response.status}, expected 200 with no redirect`);
      } catch (error) {
        expect(false, `JSON-LD URL ${url}`, `could not be fetched: ${error.message}`);
      }
    }),
  );
}

// ---------------------------------------------------------------- run

const sitemapUrls = await checkSitemap();
if (!live) {
  const built = await builtPages();
  expect(
    built.length === sitemapUrls.length && built.every((url) => sitemapUrls.includes(url)),
    "/sitemap.xml",
    `lists ${JSON.stringify(sitemapUrls)} but the build has pages ${JSON.stringify(built)}; they must be the same`,
  );
}
await checkRobots();
const llms = await checkLlms();
await checkSecurityTxt();
await checkIndexNowKey();

const titles = [];
let jsonLdUrls = [];
for (const url of sitemapUrls) {
  const page = await checkPage(url);
  if (!page) continue;
  titles.push(page.title);
  if (url === HOME) jsonLdUrls = await checkJsonLd(page, llms);
  else expect(page.blocks.length === 0, pathOf(url), "has JSON-LD; only the homepage carries the graph");
}
expect(sitemapUrls.includes(HOME), "/sitemap.xml", `must list the homepage, ${HOME}`);

const missing = live ? await checkMissingPage() : await getOk("/404.html");
if (missing) {
  const doc = parse(missing.body.toString("utf8"));
  titles.push(await checkDocument("404 page", doc));
  expect(links(doc, "canonical").length === 0, "404 page", "must not have a canonical");
  expect(all(doc, "a").some((node) => attr(node, "href") === "/"), "404 page", "needs a link to /");
}
expect(new Set(titles).size === titles.length, "titles", `two pages share a title: ${JSON.stringify(titles)}`);

if (live) {
  await checkServed();
  await checkRedirects();
  await checkCrawlers();
  await checkJsonLdUrls(jsonLdUrls);
} else {
  await checkDeclaredHeaders();
  await checkBuiltAssets();
}

const target = live ? ORIGIN : fileURLToPath(dist);
if (failures.length > 0) {
  console.error(`site check: ${failures.length} of ${checks} checks failed for ${target}`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`site check: all ${checks} checks passed for ${target}`);
