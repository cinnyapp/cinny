export function pushSessionToSW(baseUrl?: string, accessToken?: string) {
  if (!('serviceWorker' in navigator)) return;
  const msg = { type: 'setSession', accessToken, baseUrl };
  // Prefer the controller (controlled page); on first load the controller is
  // null until the SW claims the page, so fall back to the active worker so
  // the session reaches the SW before media fetches need it (fixes first-load
  // 401 / broken images under authenticated media).
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
  } else {
    navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage(msg)).catch(() => {});
  }
}
