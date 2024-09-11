/// <reference lib="WebWorker" />

export type {};
declare const self: ServiceWorkerGlobalScope;

type Message = { messageId: string };
type MessageListener = (message: Message) => void;
const messageListeners = new Map<string, MessageListener>();

self.addEventListener('message', (event) => {
  const { messageId } = event.data;
  if (typeof messageId === 'string') {
    messageListeners.get(messageId)?.(event.data);
    messageListeners.delete(messageId);
  }
});

type TokenMessage = Message & {
  token?: string;
};
async function askForAccessToken(client: Client): Promise<string | undefined> {
  return new Promise((resolve) => {
    const messageId = Math.random().toString(36);
    messageListeners.set(messageId, (message: TokenMessage) => resolve(message.token));
    client.postMessage({ messageId, type: 'token' });
  });
}

function fetchConfig(token?: string): RequestInit | undefined {
  if (!token) return undefined;

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

self.addEventListener('fetch', (event: FetchEvent) => {
  const { url, method } = event.request;
  if (method !== 'GET') return;
  if (
    !url.includes('/_matrix/client/v1/media/download') &&
    !url.includes('/_matrix/client/v1/media/thumbnail')
  ) {
    return;
  }
  event.respondWith(
    (async (): Promise<Response> => {
      const client = await self.clients.get(event.clientId);
      let token: string | undefined;
      if (client) token = await askForAccessToken(client);

      return fetch(url, fetchConfig(token));
    })()
  );
});
