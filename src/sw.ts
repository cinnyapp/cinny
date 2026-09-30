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

/**
 * The browser terminates an idle service worker after a few seconds and respawns it
 * for the next fetch with the maps above empty. Asking the page for the session again
 * can take a very long time (or never be answered) while its main thread is busy, and
 * serving an authenticated media request without a token is a guaranteed 401. So the
 * last known session is also kept in this worker's own Cache storage, which survives
 * the respawn.
 *
 * The access token already lives in this origin's localStorage, so a copy in this
 * origin's cache storage is not a new exposure. It is removed as soon as the page
 * reports that there is no session anymore (logout).
 */
const SESSION_CACHE_NAME = 'cinny-sw-session';
const SESSION_CACHE_KEY = '/__cinny_sw_session__';

let lastSession: SessionInfo | undefined;
let persistedSession: Promise<SessionInfo | undefined> | undefined;

function toSessionInfo(data: unknown): SessionInfo | undefined {
  const { accessToken, baseUrl } = (data ?? {}) as Partial<SessionInfo>;
  if (typeof accessToken === 'string' && typeof baseUrl === 'string') {
    return { accessToken, baseUrl };
  }
  return undefined;
}

async function loadPersistedSession(): Promise<SessionInfo | undefined> {
  try {
    const cache = await self.caches.open(SESSION_CACHE_NAME);
    const res = await cache.match(SESSION_CACHE_KEY);
    if (!res) return undefined;
    return toSessionInfo(await res.json());
  } catch {
    // Cache storage unavailable or the entry is unreadable - act as if empty.
    return undefined;
  }
}

async function persistSession(session: SessionInfo | undefined): Promise<void> {
  try {
    const cache = await self.caches.open(SESSION_CACHE_NAME);
    if (!session) {
      await cache.delete(SESSION_CACHE_KEY);
      return;
    }
    await cache.put(
      SESSION_CACHE_KEY,
      new Response(JSON.stringify(session), {
        headers: { 'content-type': 'application/json' },
      })
    );
  } catch {
    // Ignore - the in-memory session still covers this worker's lifetime.
  }
}

let persistQueue: Promise<void> = Promise.resolve();

/**
 * Serialize the writes so the newest session always wins - a login immediately
 * followed by a logout must not leave the old token behind.
 */
function queuePersistSession(session: SessionInfo | undefined): Promise<void> {
  persistQueue = persistQueue.then(() => persistSession(session));
  return persistQueue;
}

function getLastKnownSession(): Promise<SessionInfo | undefined> {
  if (lastSession) return Promise.resolve(lastSession);
  if (!persistedSession) {
    persistedSession = loadPersistedSession();
  }
  return persistedSession;
}

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

function setSession(clientId: string, accessToken: unknown, baseUrl: unknown): Promise<void> {
  const session = toSessionInfo({ accessToken, baseUrl });
  if (session) {
    sessions.set(clientId, session);
  } else {
    // Logout or invalid session
    sessions.delete(clientId);
  }

  const unchanged =
    !!session &&
    !!lastSession &&
    lastSession.accessToken === session.accessToken &&
    lastSession.baseUrl === session.baseUrl;

  lastSession = session;
  persistedSession = Promise.resolve(session);

  const resolveSession = clientToResolve.get(clientId);
  if (resolveSession) {
    resolveSession(sessions.get(clientId));
    clientToResolve.delete(clientId);
    clientToSessionPromise.delete(clientId);
  }

  // Pages re-push the same session on every load and on every tab focus; only
  // write when it actually changed (a removal is always written).
  if (unchanged) return Promise.resolve();
  return queuePersistSession(session);
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
  timeoutMs = 10000
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
    // waitUntil so the worker is not terminated before the session is persisted
    // (or cleared, on logout, where the page reloads right after).
    event.waitUntil(setSession(client.id, accessToken, baseUrl));
    cleanupDeadClients();
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

  const session = clientId ? sessions.get(clientId) : undefined;
  if (session) {
    if (validMediaRequest(url, session.baseUrl)) {
      event.respondWith(fetch(url, fetchConfig(session.accessToken)));
    }
    return;
  }

  event.respondWith(
    (async () => {
      // The session this worker last saw: from memory, or restored from cache
      // storage after the worker was terminated and respawned.
      const knownSession = await getLastKnownSession();
      if (knownSession) {
        if (validMediaRequest(url, knownSession.baseUrl)) {
          return fetch(url, fetchConfig(knownSession.accessToken));
        }
        // Some other host's media path - never attach our token to it.
        return fetch(event.request);
      }

      // Nothing stored at all: ask the page, and wait for it. On a large account
      // its main thread can be blocked for many seconds, and answering early with
      // a credential-less request only produces a 401 that looks like a broken file.
      const pageSession = clientId ? await requestSessionWithTimeout(clientId) : undefined;
      if (pageSession && validMediaRequest(url, pageSession.baseUrl)) {
        return fetch(url, fetchConfig(pageSession.accessToken));
      }

      // Truly no session (e.g. logged out) - let the request go as it is.
      return fetch(event.request);
    })()
  );
});
