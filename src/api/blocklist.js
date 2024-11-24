// @ts-check

import { unwrapShortHandle, v1APIPrefix, xAPIKey } from '.';
import { parseNumberWithCommas, unwrapClearSkyURL } from './core';
import { resolveHandleOrDID } from './resolve-handle-or-did';

const blocklistFetchQueued = new Map();
let blocklistDebounce = 0;

/**
 * @param {string} handleOrDID
 */
export function blocklist(handleOrDID) {
  if (blocklistFetchQueued.has(handleOrDID)) return blocklistFetchQueued.get(handleOrDID);

  blocklistFetchQueued.set(handleOrDID, blocklistCall(handleOrDID, 'blocklist'));

  clearTimeout(blocklistDebounce);
  blocklistDebounce = setTimeout(() => blocklistFetchQueued.delete(handleOrDID), 1000);

  return blocklistCall(handleOrDID, 'blocklist');
}

const singleBlocklistFetchQueued = new Map();
let singleBlocklistDebounce = 0;

/**
 * @param {string} handleOrDID
 */
export function singleBlocklist(handleOrDID) {
  if (singleBlocklistFetchQueued.has(handleOrDID)) return singleBlocklistFetchQueued.get(handleOrDID);

  singleBlocklistFetchQueued.set(handleOrDID, blocklistCall(handleOrDID, 'single-blocklist'));

  clearTimeout(singleBlocklistDebounce);
  singleBlocklistDebounce = setTimeout(() => singleBlocklistFetchQueued.delete(handleOrDID), 1000);

  return blocklistCall(handleOrDID, 'single-blocklist');;
}

/**
 * @typedef {{
 *  shortDID: string,
 *  api: string,
 *  count: number,
 *  nextPage: number,
 *  blocklist: BlockedByRecord[]
 * }} BlockCacheEntry
 */

/**
 * @type {{ [key: string]: BlockCacheEntry }}
 */
const blockApiResultCache = {};

/**
 * @param {string} handleOrDID
 * @param {string} api
 * @returns {AsyncGenerator<{
 *    count: number,
 *    nextPage: number,
 *    blocklist: BlockedByRecord[]
 * }>}
 */
async function* blocklistCall(handleOrDID, api) {
  const resolved = await resolveHandleOrDID(handleOrDID);

  if (!resolved) throw new Error('Could not resolve handle or DID: ' + handleOrDID);

  const key = resolved.shortDID + '/' + api;
  let cacheEntry = blockApiResultCache[key];
  if (cacheEntry) {
    yield {
      count: cacheEntry.count,
      nextPage: cacheEntry.nextPage,
      blocklist: cacheEntry.blocklist
    };

    if (!cacheEntry.nextPage) return;
  }

  /**
   * @typedef {{
   *  data: {
   *    blocklist: BlockedByRecord[],
   *    count: string,
   *    pages: number
   *  },
   *  identity: string,
   *  status: boolean
   * }} SingleBlocklistResponse */

  const handleURL =
    unwrapClearSkyURL(v1APIPrefix + api + '/') +
    unwrapShortHandle(resolved.shortHandle);
  
  let nextPageNumber = cacheEntry?.nextPage || 1;
  while (true) {

    /** @type {SingleBlocklistResponse} */
    const pageResponse = await fetch(
      nextPageNumber === 1 ? handleURL : handleURL + '/' + nextPageNumber,
      { headers: { 'X-API-Key': xAPIKey } }).then(x => x.json());

    let pages = parseNumberWithCommas(pageResponse.data.pages) || 1;
    let count = parseNumberWithCommas(pageResponse.data.count) || 0;

    const chunk = pageResponse.data.blocklist;

    if (cacheEntry) {
      cacheEntry.blocklist = cacheEntry.blocklist.concat(chunk);
    } else {
      blockApiResultCache[key] = cacheEntry = {
        shortDID: resolved.shortDID,
        api,
        count,
        nextPage: 0,
        blocklist: chunk
      };
    }
    cacheEntry.count = count;
    cacheEntry.nextPage = nextPageNumber = nextPageNumber >= pages ? 0 : nextPageNumber + 1;

    yield {
      count,
      nextPage: cacheEntry.nextPage,
      blocklist: cacheEntry.blocklist
    };

    if (!cacheEntry.nextPage) break;
  }
}
