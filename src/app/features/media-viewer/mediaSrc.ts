/**
 * Resolving gallery items to something an <img>/<video> can show.
 *
 *  - Unencrypted: the authenticated media URL itself (the service worker adds
 *    the token), thumbnails from the server's thumbnail endpoint. Nothing is
 *    copied into memory, the browser cache does the rest.
 *  - Encrypted: download + decrypt into a blob. Full-size blobs live in a tiny
 *    LRU (current ±1) and thumbnails in a bounded one; object URLs are revoked
 *    the moment they fall out, and the full-size ones when the viewer closes.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import {
  decryptFile,
  downloadEncryptedMedia,
  downloadMedia,
  mxcUrlToHttp,
} from '../../utils/matrix';
import { getMediaFailureKind, MediaFailureKind } from '../../utils/mediaAuth';
import { GalleryItem } from './galleryWalker';

class BlobLru {
  private max: number;

  private map = new Map<string, Promise<string>>();

  private urls = new Map<string, string>();

  constructor(max: number) {
    this.max = max;
  }

  get(key: string, make: () => Promise<Blob>): Promise<string> {
    const hit = this.map.get(key);
    if (hit) {
      this.map.delete(key);
      this.map.set(key, hit);
      return hit;
    }
    const p = make().then((blob) => {
      const url = URL.createObjectURL(blob);
      if (this.map.get(key) === p) this.urls.set(key, url);
      else URL.revokeObjectURL(url); // evicted while loading
      return url;
    });
    p.catch(() => this.map.delete(key));
    this.map.set(key, p);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value as string;
      this.drop(oldest);
    }
    return p;
  }

  private drop(key: string) {
    this.map.delete(key);
    const url = this.urls.get(key);
    if (url) URL.revokeObjectURL(url);
    this.urls.delete(key);
  }

  clear() {
    Array.from(this.map.keys()).forEach((k) => this.drop(k));
  }
}

const fullCache = new BlobLru(4);
const thumbCache = new BlobLru(120);

export const clearFullSizeCache = () => fullCache.clear();

const decryptToBlob = (
  mx: MatrixClient,
  mxc: string,
  encInfo: Record<string, any>,
  mimeType: string | undefined,
  useAuthentication: boolean
) => {
  const url = mxcUrlToHttp(mx, mxc, useAuthentication);
  if (!url) return Promise.reject(new Error('Invalid media URL'));
  return downloadEncryptedMedia(url, (buf) =>
    decryptFile(buf, mimeType ?? 'application/octet-stream', encInfo as any)
  );
};

export const fullSizeUrl = (
  mx: MatrixClient,
  item: GalleryItem,
  useAuthentication: boolean
): string | Promise<string> | undefined => {
  if (!item.mxc) return undefined;
  if (item.encInfo) {
    return fullCache.get(item.mxc, () =>
      decryptToBlob(mx, item.mxc as string, item.encInfo as any, item.mimeType, useAuthentication)
    );
  }
  return mxcUrlToHttp(mx, item.mxc, useAuthentication) ?? undefined;
};

export const thumbnailUrl = (
  mx: MatrixClient,
  item: GalleryItem,
  size: number,
  useAuthentication: boolean
): string | Promise<string> | undefined => {
  if (item.encInfo) {
    if (!item.thumbEnc || !item.thumbMxc) return undefined;
    return thumbCache.get(item.thumbMxc, () =>
      decryptToBlob(
        mx,
        item.thumbMxc as string,
        item.thumbEnc as any,
        item.thumbMime ?? 'image/jpeg',
        useAuthentication
      )
    );
  }
  const src = item.kind === 'video' ? item.thumbMxc : item.mxc;
  if (!src) return undefined;
  return mxcUrlToHttp(mx, src, useAuthentication, size, size, 'scale') ?? undefined;
};

export type ResolvedSrc = {
  src?: string;
  loading: boolean;
  error?: boolean;
  failureKind?: MediaFailureKind;
};

/** Resolves a string-or-promise source into React state. */
export const useResolvedSrc = (
  get: () => string | Promise<string> | undefined,
  deps: unknown[]
): ResolvedSrc => {
  const [state, setState] = useState<ResolvedSrc>(() => {
    const v = get();
    return typeof v === 'string' || v === undefined
      ? { src: v, loading: false }
      : { loading: true };
  });
  useEffect(() => {
    let alive = true;
    const v = get();
    if (typeof v === 'string' || v === undefined) {
      setState({ src: v, loading: false });
      return undefined;
    }
    setState({ loading: true });
    v.then(
      (src) => alive && setState({ src, loading: false }),
      (err) =>
        alive && setState({ loading: false, error: true, failureKind: getMediaFailureKind(err) })
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
};

/**
 * An <img>/<video> pointed straight at an authenticated media URL fails when no
 * service worker adds the token (e.g. after a hard reload). Same recovery as
 * the timeline: on the first error fetch it once from the page (which retries
 * a 401 with the token) and show it from a blob URL; only then give up, with
 * the reason ("no longer on the server", …).
 */
export const useMediaFallback = (src: string | undefined) => {
  const [fallback, setFallback] = useState<string>();
  const [failureKind, setFailureKind] = useState<MediaFailureKind>();
  const tried = useRef(false);
  useEffect(() => {
    tried.current = false;
    setFallback(undefined);
    setFailureKind(undefined);
  }, [src]);
  useEffect(
    () => () => {
      if (fallback) URL.revokeObjectURL(fallback);
    },
    [fallback]
  );
  const onError = useCallback(() => {
    if (!src || src.startsWith('blob:') || tried.current) {
      setFailureKind((k) => k ?? 'network');
      return;
    }
    tried.current = true;
    downloadMedia(src)
      .then((blob) => setFallback(URL.createObjectURL(blob)))
      .catch((err) => setFailureKind(getMediaFailureKind(err)));
  }, [src]);
  const reset = useCallback(() => {
    tried.current = false;
    setFallback(undefined);
    setFailureKind(undefined);
  }, []);
  return { src: fallback ?? src, onError, failureKind, reset };
};

/** Warm the browser cache / blob cache for the neighbours of the current item. */
export const preloadItem = (mx: MatrixClient, item: GalleryItem, useAuthentication: boolean) => {
  if (item.kind === 'video') return; // never pull a whole video speculatively
  const v = fullSizeUrl(mx, item, useAuthentication);
  if (typeof v === 'string') {
    const img = new Image();
    img.decoding = 'async';
    img.src = v;
  } else if (v) {
    v.catch(() => undefined);
  }
};
