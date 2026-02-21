/// <reference lib="WebWorker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

let trustedHomeserverUrl: string | null = null;

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
const DEFAULT_NOTIFICATION_ICON = '/public/res/apple/apple-touch-icon-180x180.png';
const DEFAULT_NOTIFICATION_BADGE = '/public/res/apple-touch-icon-72x72.png';

const pendingReplies = new Map();
let messageIdCounter = 0;
function sendAndWaitForReply(client: WindowClient, type: string, payload: object) {
  messageIdCounter += 1;
  const id = messageIdCounter;
  const promise = new Promise((resolve) => {
    pendingReplies.set(id, resolve);
  });
  client.postMessage({ type, id, payload });
  
  return promise;
}

/**
 * Receive session updates from clients
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const client = event.source as Client | null;
  if (!client) return;
function validMediaRequest(url: string, baseUrl: string): boolean {
        const downloadUrl = new URL('/_matrix/client/v1/media/download', baseUrl);
        const thumbnailUrl = new URL('/_matrix/client/v1/media/thumbnail', baseUrl);

        return url.startsWith(downloadUrl.href) || url.startsWith(thumbnailUrl.href);
    }


async function fetchWithRetry(
  url: string,
  token: string,
  retries = 3,
  delay = 250
): Promise<Response> {
  let lastError: Error | undefined;

  /*  eslint-disable no-await-in-loop */
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
        const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        console.warn(
          `Fetch attempt ${attempt} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );
        await new Promise((res) => {
          setTimeout(res, delay);
        });
      }
    }
  }
  /*  eslint-enable no-await-in-loop */
  throw new Error(`Fetch failed after ${retries} retries. Last error: ${lastError?.message}`);
}


function fetchConfig(token?: string): RequestInit | undefined {
  if (!token) return undefined;

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
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data.type === 'togglePush') {
    const token = event?.data?.token;
      //   const homeServer = payload?.homeServerUrl;

    const fetchOptions = fetchConfig(token);
    event.waitUntil(
      fetch(`${event.data.url}/_matrix/client/v3/pushers/set`, {
        method: 'POST',
        ...fetchOptions,
        body: JSON.stringify(event.data.pusherData),
      })
    );
    return;
  }
  const { replyTo } = event.data;
  if (replyTo) {
    const resolve = pendingReplies.get(replyTo);
    if (resolve) {
      pendingReplies.delete(replyTo);
      resolve(event.data.payload);
    }
  }
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
    })()
  );
});

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting());
});

const onPushNotification = async (event: PushEvent) => {
  let title = 'New Notification';
  const options: NotificationOptions = {
    body: 'You have a new message!',
    icon: DEFAULT_NOTIFICATION_ICON,
    badge: DEFAULT_NOTIFICATION_BADGE,
    data: {
      url: self.registration.scope,
      timestamp: Date.now(),
    },
    // tag: 'cinny-notification-tag', // Optional: Replaces existing notification with same tag
    // renotify: true, // Optional: If using tag, renotify will alert user even if tag matches
    // silent: false, // Optional: Set to true for no sound/vibration. User can also set this.
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      title = pushData.title || title;
      options.body = options.body ?? pushData.data.toString();
      options.icon = pushData.icon || options.icon;
      options.badge = pushData.badge || options.badge;

      if (pushData.image) options.image = pushData.image;
      if (pushData.vibrate) options.vibrate = pushData.vibrate;
      if (pushData.actions) options.actions = pushData.actions;
      options.tag = 'Cinny';
      if (typeof pushData.renotify === 'boolean') options.renotify = pushData.renotify;
      if (typeof pushData.silent === 'boolean') options.silent = pushData.silent;

      if (pushData.data) {
        options.data = { ...options.data, ...pushData.data };
      }
      if (typeof pushData.unread === 'number') {
        try {
          self.navigator.setAppBadge(pushData.unread);
        } catch (e) {
          // Likely Firefox/Gecko-based and doesn't support badging API
        }
      } else {
        await navigator.clearAppBadge();
      }
    } catch (e) {
      const pushText = event.data.text();
      options.body = pushText || options.body;
    }
  }

  return self.registration.showNotification(title, options);
};

self.addEventListener('push', (event: PushEvent) => event.waitUntil(onPushNotification(event)));

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  /**
   * We should likely add a postMessage back to navigate to the room the event is from
   */
  const targetUrl = event.notification.data?.url || self.registration.scope;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return (client as WindowClient).focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return Promise.resolve();
    })
  );
});

if (self.__WB_MANIFEST) {
  precacheAndRoute(self.__WB_MANIFEST);
}
cleanupOutdatedCaches();
