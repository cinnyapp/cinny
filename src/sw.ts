/// <reference lib="WebWorker" />

export type {};
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

type SessionInfo = {
  accessToken: string;
  baseUrl: string;
};

/**
 * Store session per client (tab)
 */
const sessions = new Map<string, SessionInfo>();

async function cleanupDeadClients() {
  const activeClients = await self.clients.matchAll();
  const activeIds = new Set(activeClients.map((c) => c.id));

  Array.from(sessions.keys()).forEach((id) => {
    if (!activeIds.has(id)) {
      sessions.delete(id);
    }
  });
}

/**
 * Receive session updates from clients
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const client = event.source as Client | null;
  if (!client) return;

  const { type, accessToken, baseUrl } = event.data || {};

  if (type !== 'setSession') return;

  cleanupDeadClients();

  if (typeof accessToken === 'string' && typeof baseUrl === 'string') {
    sessions.set(client.id, { accessToken, baseUrl });
  } else {
    // Logout or invalid session
    sessions.delete(client.id);
  }
});

function validMediaRequest(url: string, baseUrl: string): boolean {
  const downloadUrl = new URL('/_matrix/client/v1/media/download', baseUrl);
  const thumbnailUrl = new URL('/_matrix/client/v1/media/thumbnail', baseUrl);

  return url.startsWith(downloadUrl.href) || url.startsWith(thumbnailUrl.href);
}

function fetchConfig(token: string): RequestInit {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'default',
  };
}

self.addEventListener('fetch', (event: FetchEvent) => {
  const { url, method } = event.request;

  if (method !== 'GET') return;
  if (!event.clientId) return;

  const session = sessions.get(event.clientId);
  if (!session) return;

  if (!validMediaRequest(url, session.baseUrl)) return;

  event.respondWith(fetch(url, fetchConfig(session.accessToken)));
});
