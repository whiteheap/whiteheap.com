#!/usr/bin/env node
// Tells the search engines that read IndexNow (Bing, Yandex, Seznam, Naver and
// others; Google does not take part) that pages on whiteheap.com were added,
// changed or removed. `pnpm run deploy` calls announce() with the pages whose
// HTML the deploy changed, and with no others.
//
// By hand, with only the URLs that changed:
//   pnpm run indexnow https://whiteheap.com/
//
// Protocol: https://www.indexnow.org/documentation

import { pathToFileURL } from "node:url";
import { INDEXNOW_ENDPOINT, INDEXNOW_KEY, ORIGIN } from "./site.mjs";

/** Sends `urls` in one request. Throws unless IndexNow answers 200 or 202. */
export async function announce(urls) {
  const foreign = urls.filter((url) => !url.startsWith(`${ORIGIN}/`));
  if (foreign.length > 0) throw new Error(`not on ${ORIGIN}: ${foreign.join(" ")}`);
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(ORIGIN).host,
      key: INDEXNOW_KEY,
      keyLocation: `${ORIGIN}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
  });
  // 200: received. 202: received, and the key file is still to be checked.
  // 403: the key file is missing or wrong. 422: a URL is not on this host.
  // 429: too many requests.
  if (response.status !== 200 && response.status !== 202) {
    const detail = (await response.text()).trim().slice(0, 300);
    throw new Error(`IndexNow answered ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return response.status;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.error("usage: pnpm run indexnow <url> [<url> ...]   only URLs whose page changed");
    process.exit(2);
  }
  try {
    const status = await announce(urls);
    console.log(`IndexNow: ${status}, announced ${urls.join(" ")}`);
  } catch (error) {
    console.error(`IndexNow: ${error.message}`);
    process.exit(1);
  }
}
