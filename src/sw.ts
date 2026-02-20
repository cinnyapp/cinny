/// <reference lib="WebWorker" />

export type {};
declare const self: ServiceWorkerGlobalScope;

type SessionInfo = {
  accessToken: string;
  baseUrl: string;
};

/**
 * Store session per client (tab)
 */
const sessions = new Map<string, SessionInfo>();

const clientToResolve = new Map<string, (value: SessionInfo | undefined) => void>();
const clientToSessionPromise = new Map<string, Promise<SessionInfo | undefined>>();

async function cleanupDeadClients() {
  const activeClients = await self.clients.matchAll();
  const activeIds = new Set(activeClients.map((c) => c.id));

  Array.from(sessions.keys()).forEach((id) => {
    if (!activeIds.has(id)) {
      sessions.delete(id);
      clientToResolve.delete(id);
      clientToSessionPromise.delete(id);
    }
  });
}

function setSession(clientId: string, accessToken: any, baseUrl: any) {
  if (typeof accessToken === 'string' && typeof baseUrl === 'string') {
    sessions.set(clientId, { accessToken, baseUrl });
  } else {
    // Logout or invalid session
    sessions.delete(clientId);
  }

  const resolveSession = clientToResolve.get(clientId);
  if (resolveSession) {
    resolveSession(sessions.get(clientId));
    clientToResolve.delete(clientId);
    clientToSessionPromise.delete(clientId);
  }
}

function requestSession(client: Client): Promise<SessionInfo | undefined> {
  const promise =
    clientToSessionPromise.get(client.id) ??
    new Promise((resolve) => {
      clientToResolve.set(client.id, resolve);
      client.postMessage({ type: 'requestSession' });
    });

  if (!clientToSessionPromise.has(client.id)) {
    clientToSessionPromise.set(client.id, promise);
  }

  return promise;
}

async function requestSessionWithTimeout(
  clientId: string,
  timeoutMs = 3000
): Promise<SessionInfo | undefined> {
  const client = await self.clients.get(clientId);
  if (!client) return undefined;

  const sessionPromise = requestSession(client);

  const timeout = new Promise<undefined>((resolve) => {
    setTimeout(() => resolve(undefined), timeoutMs);
  });

  return Promise.race([sessionPromise, timeout]);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await cleanupDeadClients();
    })()
  );
});

/**
 * Receive session updates from clients
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const client = event.source as Client | null;
  if (!client) return;

  const { type, accessToken, baseUrl } = event.data || {};

  if (type === 'setSession') {
    setSession(client.id, accessToken, baseUrl);
    cleanupDeadClients();
  }
});

function isMediaRequest(url: string, baseUrl?: string): boolean {
  const mediaPaths = ['/_matrix/client/v1/media/download', '/_matrix/client/v1/media/thumbnail'];
  try {
    const { pathname } = new URL(url);
    if (!mediaPaths.some((p) => pathname.startsWith(p))) return false;
  } catch {
    return false;
  }
  if (!baseUrl) return true;

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

function respondMediaRequest(event: FetchEvent, session: SessionInfo): void {
  const { url } = event.request;
  if (!isMediaRequest(url, session.baseUrl)) return;

  event.respondWith(fetch(url, fetchConfig(session.accessToken)));
}

self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method !== 'GET') return;

  const { clientId } = event;
  if (!clientId) return;

  const session = sessions.get(clientId);
  if (session) {
    respondMediaRequest(event, session);
    return;
  }

  const { url } = event.request;
  if (!isMediaRequest(url)) return;

  // respondWith must be called synchronously, so
  // we pass a Promise and the browser
  // suspends the request while we wait for the session
  event.respondWith(
    requestSessionWithTimeout(clientId).then((s) => {
      if (!s) return fetch(url);
      if (!isMediaRequest(url, s.baseUrl)) return fetch(url);
      return fetch(url, fetchConfig(s.accessToken));
    })
  );
});
