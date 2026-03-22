import { useEffect, useState } from 'react';
import { isCapacitorNative } from '../utils/capacitor';

/**
 * In Capacitor (WKWebView), <img src> tags cannot send Authorization headers,
 * so authenticated media endpoints return 401. This hook fetches the image
 * with the auth token and returns a local blob URL instead.
 *
 * On web, the service worker handles auth transparently, so we return the
 * original URL unchanged.
 */
export const useAuthenticatedImageUrl = (src: string | undefined): string | undefined => {
  const [blobUrl, setBlobUrl] = useState<string | undefined>(src);

  useEffect(() => {
    if (!src || !isCapacitorNative()) {
      setBlobUrl(src);
      return;
    }

    let revoked = false;
    let objectUrl: string | undefined;

    const token = localStorage.getItem('cinny_access_token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(src, { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!revoked) setBlobUrl(undefined);
      });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return blobUrl;
};
