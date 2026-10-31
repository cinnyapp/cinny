/**
 * Link previews, fetched once per URL per page session.
 *
 * Previously every time a message scrolled back into view (the timeline is
 * virtualised, so cards remount constantly) its preview was asked for again,
 * including the ones that had just failed: a shop that blocks bots (galaxus.ch)
 * makes the homeserver wait for its own fetch timeout and answer 504, every
 * single time. Now:
 *  - a successful preview is reused;
 *  - concurrent cards for the same URL share one request;
 *  - a URL that failed is not asked for again for a while; and a timeout
 *    (504 / network) parks the whole site for a while, because every other link
 *    to that site will time out the same way.
 * Nothing is persisted - a reload starts clean. The plain link is always shown.
 */

const URL_FAILURE_TTL_MS = 30 * 60 * 1000;
const HOST_TIMEOUT_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;

export class UrlPreviewSkipped extends Error {
  constructor(url: string) {
    super(`Link preview skipped (failed recently): ${url}`);
    this.name = 'UrlPreviewSkipped';
  }
}

const hostOf = (url: string): string | undefined => {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return undefined;
  }
};

const statusOf = (err: unknown): number | undefined => {
  const e = err as { httpStatus?: unknown; status?: unknown } | undefined;
  if (typeof e?.httpStatus === 'number') return e.httpStatus;
  if (typeof e?.status === 'number') return e.status;
  return undefined;
};

/** Timeouts (or no answer at all) say something about the whole site. */
const isSiteTimeout = (status?: number) =>
  status === undefined || status === 504 || status === 524 || status === 408;

export const createUrlPreviewCache = <T>(now: () => number = Date.now) => {
  const ok = new Map<string, T>();
  const pending = new Map<string, Promise<T>>();
  const failedUrl = new Map<string, number>();
  const failedHost = new Map<string, number>();

  const trim = (m: Map<string, unknown>) => {
    if (m.size <= MAX_ENTRIES) return;
    const oldest = m.keys().next().value;
    if (oldest !== undefined) m.delete(oldest);
  };

  const blockedUntil = (url: string): number | undefined => {
    const t = now();
    const u = failedUrl.get(url);
    if (u !== undefined && u > t) return u;
    const host = hostOf(url);
    const h = host ? failedHost.get(host) : undefined;
    if (h !== undefined && h > t) return h;
    return undefined;
  };

  const get = (url: string, fetcher: () => Promise<T>): Promise<T> => {
    if (ok.has(url)) return Promise.resolve(ok.get(url) as T);
    const inFlight = pending.get(url);
    if (inFlight) return inFlight;
    if (blockedUntil(url) !== undefined) return Promise.reject(new UrlPreviewSkipped(url));

    const req = fetcher().then(
      (data) => {
        pending.delete(url);
        ok.set(url, data);
        trim(ok);
        return data;
      },
      (err) => {
        pending.delete(url);
        failedUrl.set(url, now() + URL_FAILURE_TTL_MS);
        trim(failedUrl);
        const host = hostOf(url);
        if (host && isSiteTimeout(statusOf(err))) {
          failedHost.set(host, now() + HOST_TIMEOUT_TTL_MS);
          trim(failedHost);
        }
        throw err;
      }
    );
    pending.set(url, req);
    return req;
  };

  return { get, blockedUntil };
};

const shared = createUrlPreviewCache<unknown>();

export const getCachedUrlPreview = <T>(url: string, fetcher: () => Promise<T>): Promise<T> =>
  shared.get(url, fetcher) as Promise<T>;
