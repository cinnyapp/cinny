/*
 * Send the first incremental /sync as soon as the saved sync token is known.
 *
 * After an F5 the messages that arrived while the tab was closed come with the
 * first live /sync. matrix-js-sdk only sends that request after GET /pushrules,
 * GET /user/…/filter/… and a store round trip (`SyncApi.sync()`), measured
 * 2026-10-21 at 500-600 ms after `startClient` — the catch-up then landed ~1 s
 * after the app had opened. Here the same request (same filter id, `since`,
 * `timeout=0`, `use_state_after`) is sent right after the store is ready, and
 * handed to the SDK when it asks for exactly that request.
 *
 * Safe by construction: it is a GET; a prefetch the SDK never asks for (other
 * filter id, other params, client stopped) is simply dropped — an incremental
 * /sync acknowledges nothing until a request with its `next_batch` is made, so
 * the SDK's own request gets the same data. Feature-detected (`mx.http`).
 */
import { markStartup } from './startup-marks';

type QueryParams = Record<string, unknown>;
type RequestOpts = { localTimeoutMs?: number; abortSignal?: AbortSignal; [k: string]: unknown };
type AuthedRequest = (
  method: string,
  path: string,
  queryParams?: QueryParams,
  body?: unknown,
  opts?: RequestOpts,
  ...rest: unknown[]
) => unknown;
type HttpLike = { authedRequest?: AuthedRequest; __cinnySyncPrefetch?: boolean };

/** a prefetch older than this is not handed out any more */
export const SYNC_PREFETCH_TTL_MS = 30_000;
/** what the SDK adds to timeout=0 for the local timeout (BUFFER_PERIOD_MS) */
const SDK_BUFFER_MS = 80_000;

type Pending = {
  qps: QueryParams;
  promise: Promise<unknown>;
  controller?: AbortController;
  at: number;
};

let pending: Pending | undefined;
let inner: AuthedRequest | undefined;
let innerThis: unknown;

/** Same query: same keys with a defined value, same values (compared as strings). */
export const sameQuery = (a: QueryParams | undefined, b: QueryParams | undefined): boolean => {
  if (!a || !b) return false;
  const keys = (q: QueryParams) =>
    Object.keys(q)
      .filter((k) => q[k] !== undefined && q[k] !== null)
      .sort();
  const ka = keys(a);
  const kb = keys(b);
  return (
    ka.length === kb.length && ka.every((k, i) => k === kb[i] && String(a[k]) === String(b[k]))
  );
};

/** The query matrix-js-sdk sends for the first /sync after a refresh (sync.ts getSyncParams). */
export const firstIncrementalSyncQuery = (filterId: string, since: string): QueryParams => ({
  filter: filterId,
  timeout: 0,
  'org.matrix.msc4222.use_state_after': true,
  since,
});

/**
 * Wrap `mx.http.authedRequest` (install it AFTER the other wrappers so it is the
 * outermost): a GET /sync whose query equals the pending prefetch gets the
 * prefetched promise, once. Everything else passes through untouched.
 */
export const installSyncPrefetch = (
  mx: { http?: unknown },
  now: () => number = Date.now
): boolean => {
  const http = mx.http as HttpLike | undefined;
  if (!http || typeof http.authedRequest !== 'function' || http.__cinnySyncPrefetch) return false;
  const original = http.authedRequest;
  inner = original;
  innerThis = http;
  // eslint-disable-next-line no-param-reassign
  http.authedRequest = function prefetchAwareAuthedRequest(
    this: unknown,
    method,
    path,
    queryParams,
    body,
    opts,
    ...rest
  ) {
    const p = pending;
    if (
      p &&
      method === 'GET' &&
      path === '/sync' &&
      now() - p.at < SYNC_PREFETCH_TTL_MS &&
      sameQuery(queryParams, p.qps)
    ) {
      pending = undefined;
      // the SDK aborts its request on stopClient(): abort the prefetch with it
      const signal = opts?.abortSignal;
      if (signal && p.controller) {
        if (signal.aborted) p.controller.abort();
        else signal.addEventListener('abort', () => p.controller?.abort(), { once: true });
      }
      markStartup('sync1-prefetch-used');
      return p.promise;
    }
    return original.call(this, method, path, queryParams, body, opts, ...rest);
  };
  // eslint-disable-next-line no-param-reassign
  http.__cinnySyncPrefetch = true;
  return true;
};

/** Send the first incremental /sync now; the SDK picks it up when it asks for the same query. */
export const prefetchFirstSync = (
  filterId: string | null | undefined,
  since: string | null | undefined,
  now: () => number = Date.now
): boolean => {
  if (!inner || !filterId || !since || pending) return false;
  const qps = firstIncrementalSyncQuery(filterId, since);
  const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
  let promise: Promise<unknown>;
  try {
    promise = Promise.resolve(
      inner.call(innerThis, 'GET', '/sync', qps, undefined, {
        localTimeoutMs: SDK_BUFFER_MS,
        ...(controller ? { abortSignal: controller.signal } : {}),
      })
    );
  } catch {
    return false;
  }
  const entry: Pending = { qps, promise, controller, at: now() };
  pending = entry;
  // a failed prefetch is never handed out: the SDK sends (and retries) its own
  promise.catch(() => {
    if (pending === entry) pending = undefined;
  });
  markStartup('sync1-prefetched');
  return true;
};

/** test hook */
export const resetSyncPrefetch = (): void => {
  pending = undefined;
  inner = undefined;
  innerThis = undefined;
};
