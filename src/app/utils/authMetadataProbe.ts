/**
 * Remember that a homeserver has no OIDC (MSC2965) auth metadata.
 *
 * On every start the client asks `/auth_metadata` and then `/auth_issuer`;
 * on a password-login homeserver (like chagai.website) both are 404, and the
 * browser prints both as red errors on every page load. The answer only
 * changes when the server admin switches to OIDC, so a "not available" answer
 * is remembered for a day per homeserver and the probe is skipped meanwhile.
 */

const KEY = 'cinny_auth_metadata_absent';
export const AUTH_METADATA_ABSENT_TTL_MS = 24 * 60 * 60 * 1000;

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const read = (store: Store): Record<string, number> => {
  try {
    const v = JSON.parse(store.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
};

const isNotSupported = (err: unknown): boolean => {
  const e = err as { httpStatus?: unknown; errcode?: unknown } | undefined;
  return e?.httpStatus === 404 || e?.errcode === 'M_UNRECOGNIZED' || e?.errcode === 'M_NOT_FOUND';
};

export const probeAuthMetadata = async <T>(
  baseUrl: string,
  fetchMetadata: () => Promise<T>,
  store: Store | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
  now: () => number = Date.now
): Promise<T | undefined> => {
  const known = store ? read(store) : {};
  const until = known[baseUrl];
  if (typeof until === 'number' && until > now()) return undefined;
  try {
    return await fetchMetadata();
  } catch (err) {
    if (store && isNotSupported(err)) {
      try {
        store.setItem(
          KEY,
          JSON.stringify({ ...known, [baseUrl]: now() + AUTH_METADATA_ABSENT_TTL_MS })
        );
      } catch {
        // storage full / blocked - just probe again next time
      }
      return undefined;
    }
    throw err;
  }
};
