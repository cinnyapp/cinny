import type { SpecVersions } from '../cs-api';

/*
 * The last good /_matrix/client/versions answer per homeserver, in localStorage.
 * Read by SpecVersionsLoader (render without waiting for the network) and by
 * the client start-up (client/fast-versions.ts).
 */
const CACHE_PREFIX = 'cinny_spec_versions_v1:';
const cacheKey = (baseUrl: string) => `${CACHE_PREFIX}${baseUrl.replace(/\/+$/, '')}`;

export const readCachedVersions = (baseUrl: string): SpecVersions | undefined => {
  try {
    const raw = localStorage.getItem(cacheKey(baseUrl));
    if (!raw) return undefined;
    const data = JSON.parse(raw) as unknown;
    if (data && typeof data === 'object' && Array.isArray((data as SpecVersions).versions)) {
      return data as SpecVersions;
    }
  } catch {
    // storage blocked / corrupt entry: behave as if nothing was cached
  }
  return undefined;
};

export const writeCachedVersions = (baseUrl: string, versions: SpecVersions) => {
  try {
    localStorage.setItem(cacheKey(baseUrl), JSON.stringify(versions));
  } catch {
    // ignore (quota / private mode)
  }
};
