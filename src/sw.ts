/// <reference lib="WebWorker" />

export type {};
declare const self: ServiceWorkerGlobalScope;

type SessionInfo = {
  accessToken: string;
  baseUrl: string;
};

let _requestId = 0;
const getRequestId = () => {
  _requestId += 1;
  return _requestId;
};

const pendingSessionRequests = new Map<number, (sessionInfo: SessionInfo | undefined) => void>();

async function requestSession(clientId: string): Promise<SessionInfo | undefined> {
  const client = await self.clients.get(clientId);
  if (!client) return undefined;

  const id = getRequestId();

  const sessionPromise = new Promise<SessionInfo | undefined>((resolve) => {
    pendingSessionRequests.set(id, resolve);
    client.postMessage({ type: 'session-request', id });
  });

  const timeout = new Promise<undefined>((resolve) => {
    setTimeout(() => {
      resolve(undefined);
      pendingSessionRequests.delete(id);
    }, 3000);
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
    })()
  );
});

/**
 * Receive session updates from clients
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const client = event.source as Client | null;
  if (!client) return;

  const { type, id, accessToken, baseUrl } = event.data || {};

  if (type === 'session-request') {
    const requestResolver = pendingSessionRequests.get(id);
    pendingSessionRequests.delete(id);
    requestResolver?.({ accessToken, baseUrl });
  }
});

const MEDIA_PATHS = ['/_matrix/client/v1/media/download', '/_matrix/client/v1/media/thumbnail'];

function mediaPath(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return MEDIA_PATHS.some((p) => pathname.startsWith(p));
  } catch {
    return false;
  }
}

function validMediaRequest(url: string, baseUrl: string): boolean {
  return MEDIA_PATHS.some((p) => {
    const validUrl = new URL(p, baseUrl);
    return url.startsWith(validUrl.href);
  });
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

  if (method !== 'GET' || !mediaPath(url)) return;

  const { clientId } = event;
  if (!clientId) return;

  event.respondWith(
    requestSession(clientId).then((s) => {
      if (s && validMediaRequest(url, s.baseUrl)) {
        return fetch(url, fetchConfig(s.accessToken));
      }
      return fetch(event.request);
    })
  );
});
