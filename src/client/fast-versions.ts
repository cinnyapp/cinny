/*
 * matrix-js-sdk's `startClient()` awaits `GET /_matrix/client/versions` before
 * it even starts `SyncApi.sync()` — one network round trip in front of reading
 * the saved chats (measured 2026-10-21 on a busy server: 3.2 s between "store
 * ready" and "saved record read", all of it this request).
 *
 * Two things, both feature-detected:
 * - the request is started as soon as the client exists (in parallel with the
 *   store worker and the crypto init) instead of after them;
 * - if it has not answered within `waitMs` and Cinny has the last good answer
 *   cached (utils/specVersionsCache.ts, written by SpecVersionsLoader), the
 *   cached answer is used and the real one keeps going in the background — the
 *   SDK still stores it and builds its feature map (`canSupport`) from it.
 */
type ServerVersionsLike = { versions: string[]; unstable_features?: Record<string, boolean> };
type ClientLike = {
  getVersions?: () => Promise<ServerVersionsLike>;
  __cinnyFastVersions?: boolean;
};

export const VERSIONS_WAIT_MS = 400;

export const installFastVersions = (
  mx: unknown,
  cached: ServerVersionsLike | undefined,
  waitMs = VERSIONS_WAIT_MS
): boolean => {
  const client = mx as ClientLike | undefined;
  if (!client || typeof client.getVersions !== 'function' || client.__cinnyFastVersions) {
    return false;
  }
  const original = client.getVersions.bind(client);
  let real: Promise<ServerVersionsLike> | undefined;
  let answered = false;
  const start = (): Promise<ServerVersionsLike> => {
    if (!real) {
      const attempt = original();
      real = attempt;
      attempt.then(
        () => {
          answered = true;
        },
        () => {
          // the SDK forgets a failed answer too: let the next call ask again
          if (real === attempt) real = undefined;
        }
      );
    }
    return real;
  };
  client.getVersions = () => {
    const pending = start();
    if (answered || !cached) return pending;
    return Promise.race([
      pending.catch(() => cached),
      new Promise<ServerVersionsLike>((resolve) => {
        setTimeout(() => resolve(cached), waitMs);
      }),
    ]);
  };
  client.__cinnyFastVersions = true;
  // start the request now, in parallel with the store worker and crypto init
  start().catch(() => undefined);
  return true;
};
