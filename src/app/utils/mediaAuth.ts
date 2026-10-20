/**
 * Authenticated media without depending on the service worker.
 *
 * Synapse only serves media from `/_matrix/client/v1/media/...` with an
 * `Authorization: Bearer` header. Normally the service worker adds it, but the
 * page is not always controlled by the worker - after a hard reload
 * (Ctrl+Shift+R) the browser bypasses it for the page's whole life, and every
 * media request then comes back 401 M_MISSING_TOKEN. The page has the token
 * itself, so on a 401 it can simply ask again with the header.
 *
 * Kept free of app imports so it can be unit-tested with plain node.
 */

export type MediaFailureKind = 'unauthorized' | 'missing' | 'server' | 'network';

export class MediaLoadError extends Error {
  readonly kind: MediaFailureKind;

  readonly status?: number;

  constructor(kind: MediaFailureKind, status?: number) {
    super(
      status === undefined
        ? `Failed to download media! (${kind})`
        : `Failed to download media! Status: ${status}`
    );
    this.name = 'MediaLoadError';
    this.kind = kind;
    this.status = status;
  }
}

export const mediaFailureKind = (status?: number): MediaFailureKind => {
  if (status === undefined || status === 0) return 'network';
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404 || status === 410) return 'missing';
  return 'server';
};

export const getMediaFailureKind = (error: unknown): MediaFailureKind =>
  error instanceof MediaLoadError ? error.kind : 'network';

/** One plain sentence for the person looking at a broken attachment. */
export const describeMediaFailure = (kind: MediaFailureKind, what = 'file'): string => {
  switch (kind) {
    case 'missing':
      return `This ${what} is no longer on the server.`;
    case 'unauthorized':
      return `Couldn't sign the request for this ${what}. Reload the page (F5) and try again.`;
    case 'server':
      return `The server couldn't send this ${what} right now.`;
    default:
      return `Couldn't load this ${what}. Check the connection and try again.`;
  }
};

export type MediaSession = { baseUrl: string; accessToken: string };

const MEDIA_PATHS = ['/_matrix/client/v1/media/download', '/_matrix/client/v1/media/thumbnail'];

/**
 * The token to attach to `src` - only when `src` is the session's own
 * homeserver authenticated-media endpoint (never leak it to another host).
 */
export const tokenForMediaUrl = (src: string, session?: MediaSession): string | undefined => {
  if (!session?.accessToken || !session.baseUrl) return undefined;
  try {
    const ok = MEDIA_PATHS.some((p) => src.startsWith(new URL(p, session.baseUrl).href));
    return ok ? session.accessToken : undefined;
  } catch {
    return undefined;
  }
};

/**
 * fetch() a media URL; if it comes back 401 (the service worker did not, or
 * could not, attach the token) ask once more with the token from the page.
 * Resolves only with an ok response; otherwise throws a MediaLoadError.
 */
export const fetchMediaResponse = async (
  src: string,
  getSession: () => MediaSession | undefined,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
  /** Known up front that no service worker will add the token (page not controlled). */
  withTokenFirst = false
): Promise<Response> => {
  const token = tokenForMediaUrl(src, getSession());
  const withToken = (): RequestInit => {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return { method: 'GET', ...init, headers };
  };

  let res: Response;
  try {
    res = await fetchImpl(src, withTokenFirst && token ? withToken() : { method: 'GET', ...init });
  } catch {
    throw new MediaLoadError('network');
  }

  if (res.status === 401 && !(withTokenFirst && token)) {
    if (token) {
      try {
        res = await fetchImpl(src, withToken());
      } catch {
        throw new MediaLoadError('network');
      }
    }
  }

  if (!res.ok) throw new MediaLoadError(mediaFailureKind(res.status), res.status);
  return res;
};
