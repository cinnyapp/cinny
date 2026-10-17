import { createClient, MatrixClient, IndexedDBStore, IndexedDBCryptoStore } from 'matrix-js-sdk';

import { cryptoCallbacks } from './secretStorageKeys';
import { clearNavToActivePathStore } from '../app/state/navToActivePath';
import { pushSessionToSW } from '../sw-session';

type Session = {
  baseUrl: string;
  accessToken: string;
  userId: string;
  deviceId: string;
};

/**
 * Build the persisted /sync store.
 *
 * With `useWorker`, matrix-js-sdk talks to IndexedDB through a web worker
 * (`RemoteIndexedDBStoreBackend`). On an account with a very large number of
 * rooms the persisted /sync blob is hundreds of megabytes, and without a worker
 * every byte of it is read, re-accumulated, `deepCopy()`-ed (a full
 * JSON.stringify + JSON.parse round-trip) and — every five minutes —
 * re-serialised **on the main thread**, which freezes the UI. A worker moves
 * all of that off the main thread and skips the `deepCopy()` entirely.
 * Element Web has always done this.
 */
const createSyncStore = (useWorker: boolean): IndexedDBStore =>
  new IndexedDBStore({
    indexedDB: global.indexedDB,
    localStorage: global.localStorage,
    dbName: 'web-sync-store',
    ...(useWorker
      ? {
          workerFactory: () =>
            new Worker(new URL('./indexeddb-worker.ts', import.meta.url), { type: 'module' }),
        }
      : {}),
  });

const createClientWithStore = (session: Session, store: IndexedDBStore): MatrixClient =>
  createClient({
    baseUrl: session.baseUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    store,
    cryptoStore: new IndexedDBCryptoStore(global.indexedDB, 'crypto-store'),
    deviceId: session.deviceId,
    timelineSupport: true,
    cryptoCallbacks: cryptoCallbacks as any,
    verificationMethods: ['m.sas.v1'],
  });

export const initClient = async (session: Session): Promise<MatrixClient> => {
  let indexedDBStore = createSyncStore(true);
  let mx = createClientWithStore(session, indexedDBStore);

  try {
    await indexedDBStore.startup();
  } catch (err) {
    // The worker could not be started (unsupported runtime, blocked by a CSP,
    // failed chunk load, ...). Fall back to the previous main-thread store
    // rather than failing to load the app at all. Nothing has used `mx` yet —
    // `createClient` does no I/O — so it is safe to rebuild both.
    // eslint-disable-next-line no-console
    console.error('initMatrix: IndexedDB worker store failed, falling back to main thread', err);
    try {
      await indexedDBStore.destroy();
    } catch {
      // ignore
    }
    indexedDBStore = createSyncStore(false);
    mx = createClientWithStore(session, indexedDBStore);
    await indexedDBStore.startup();
  }

  await mx.initRustCrypto();

  mx.setMaxListeners(50);

  return mx;
};

export const startClient = async (mx: MatrixClient) => {
  await mx.startClient({
    lazyLoadMembers: true,
  });
};

export const clearCacheAndReload = async (mx: MatrixClient) => {
  mx.stopClient();
  clearNavToActivePathStore(mx.getSafeUserId());
  await mx.store.deleteAllData();
  window.location.reload();
};

export const logoutClient = async (mx: MatrixClient) => {
  pushSessionToSW();
  mx.stopClient();
  try {
    await mx.logout();
  } catch {
    // ignore if failed to logout
  }
  await mx.clearStores();
  window.localStorage.clear();
  window.location.reload();
};

export const clearLoginData = async () => {
  pushSessionToSW();
  const dbs = await window.indexedDB.databases();

  dbs.forEach((idbInfo) => {
    const { name } = idbInfo;
    if (name) {
      window.indexedDB.deleteDatabase(name);
    }
  });

  window.localStorage.clear();
  window.location.reload();
};
