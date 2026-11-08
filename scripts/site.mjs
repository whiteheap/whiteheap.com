// Facts about whiteheap.com that the check and the deploy share.

/** The one address the site is served at. www and http redirect here. */
export const ORIGIN = "https://whiteheap.com";

/** The Organization's JSON-LD @id. Tool sites name it as their publisher. */
export const ORGANIZATION_ID = `${ORIGIN}/#organization`;

/**
 * The IndexNow key. It is public: search engines read it from
 * public/<key>.txt to confirm that a ping comes from this site. To replace it,
 * rename that file and write the new key in both places.
 */
export const INDEXNOW_KEY = "70908b6d7e362f6f50b85609b145b9d3";

/** Where IndexNow pings go: the shared endpoint Bing, Yandex and others read. */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** The HSTS max-age the Whiteheap standard asks for: two years. */
export const HSTS_MAX_AGE = 63072000;
