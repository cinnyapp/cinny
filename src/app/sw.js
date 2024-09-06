async function askForAccessToken(client) {
  return new Promise((resolve) => {
    const responseKey = Math.random().toString(36);
    const listener = (event) => {
      if (event.data.responseKey !== responseKey) return;
      resolve(event.data.token);
      self.removeEventListener('message', listener);
    };
    self.addEventListener('message', listener);
    client.postMessage({ responseKey, type: 'token' });
  });
}

self.addEventListener('fetch', (event) => {
  const { url, method } = event.request;
  if (method !== 'GET') return;
  if (
    !url.includes('/_matrix/client/v1/media/download') &&
    !url.includes('/_matrix/client/v1/media/thumbnail')
  ) {
    return;
  }
  event.respondWith(
    (async () => {
      if (!event.clientId) return;
      const client = await clients.get(event.clientId);
      if (!client) return;

      const token = await askForAccessToken(client);

      return fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    })()
  );
});
