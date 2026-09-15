function postSession(target: ServiceWorker | null, baseUrl?: string, accessToken?: string) {
  target?.postMessage({
    type: 'setSession',
    accessToken,
    baseUrl,
  });
}

export function pushSessionToSW(baseUrl?: string, accessToken?: string) {
  if (!('serviceWorker' in navigator)) return;

  const { controller } = navigator.serviceWorker;
  if (controller) {
    postSession(controller, baseUrl, accessToken);
    return;
  }

  // On the first load of a fresh registration this page is not controlled yet,
  // so there is no controller to talk to. The active worker can still be given
  // the session - it will need it as soon as it starts serving our media.
  navigator.serviceWorker.ready.then((registration) => {
    postSession(registration.active, baseUrl, accessToken);
  });
}
