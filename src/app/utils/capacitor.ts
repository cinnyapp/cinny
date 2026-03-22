/**
 * Returns true when running inside a Capacitor native shell (iOS/Android).
 * Service workers are not supported in WKWebView, so authenticated media
 * requests (which rely on the SW to inject the Authorization header) will
 * always fail. Callers should fall back to unauthenticated media endpoints.
 */
export const isCapacitorNative = (): boolean =>
  typeof window !== 'undefined' && window.location.protocol === 'capacitor:';
