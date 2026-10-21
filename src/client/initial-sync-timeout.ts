/*
 * The very first /sync of a big account is slow on the SERVER side: Synapse
 * needs 55-80+ s to build the 9,000-room response. matrix-js-sdk gives up on
 * that request after `timeout + 80 s` (`BUFFER_PERIOD_MS`), and the initial
 * sync is sent with `timeout=0` — so after exactly 80 s the client aborts and
 * starts the whole request over, doubling the one-time cold load (measured
 * 2026-10-20: two 80.0 s aborts in a row before a retry succeeded).
 *
 * This lets ONLY the initial sync (no `since` token) wait longer. Incremental
 * syncs keep the SDK's own timeout. Feature-detected: when the http layer does
 * not look like the one we know, nothing is changed.
 */
import { markStartup } from './startup-marks';

export const INITIAL_SYNC_LOCAL_TIMEOUT_MS = 6 * 60_000;

type AuthedRequest = (
  method: string,
  path: string,
  queryParams?: Record<string, unknown>,
  body?: unknown,
  opts?: { localTimeoutMs?: number; [k: string]: unknown },
  ...rest: unknown[]
) => unknown;

type HttpLike = { authedRequest?: AuthedRequest; __cinnyInitialSyncTimeout?: boolean };

/** Decide the local timeout for one request; exported for the unit test. */
export const initialSyncTimeoutFor = (
  path: string,
  queryParams: Record<string, unknown> | undefined,
  current: number | undefined,
  minimum = INITIAL_SYNC_LOCAL_TIMEOUT_MS
): number | undefined => {
  if (path !== '/sync') return current;
  if (queryParams && typeof queryParams === 'object' && 'since' in queryParams) return current;
  if (current !== undefined && current >= minimum) return current;
  return minimum;
};

export const installInitialSyncTimeout = (
  mx: { http?: unknown },
  minimum = INITIAL_SYNC_LOCAL_TIMEOUT_MS
): boolean => {
  const http = mx.http as HttpLike | undefined;
  if (!http || typeof http.authedRequest !== 'function' || http.__cinnyInitialSyncTimeout) {
    return false;
  }
  const original = http.authedRequest;
  // eslint-disable-next-line no-param-reassign
  http.authedRequest = function patchedAuthedRequest(
    this: unknown,
    method,
    path,
    queryParams,
    body,
    opts,
    ...rest
  ) {
    const wanted = initialSyncTimeoutFor(path, queryParams, opts?.localTimeoutMs, minimum);
    const nextOpts =
      wanted === opts?.localTimeoutMs ? opts : { ...(opts ?? {}), localTimeoutMs: wanted };
    const result = original.call(this, method, path, queryParams, body, nextOpts, ...rest);
    if (path === '/sync') {
      // start-up timeline (client/startup-marks.ts): the first /sync request and its answer
      markStartup('sync1-sent');
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<unknown>).then(
          () => markStartup('sync1-received'),
          () => undefined
        );
      }
    }
    return result;
  };
  // eslint-disable-next-line no-param-reassign
  http.__cinnyInitialSyncTimeout = true;
  return true;
};
