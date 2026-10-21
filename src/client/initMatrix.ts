import {
  createClient,
  Filter,
  MatrixClient,
  IndexedDBStore,
  IndexedDBCryptoStore,
} from 'matrix-js-sdk';
import { SyncApi } from 'matrix-js-sdk/lib/sync.js';

import { cryptoCallbacks } from './secretStorageKeys';
import { clearNavToActivePathStore } from '../app/state/navToActivePath';
import { pushSessionToSW } from '../sw-session';
import { installPushRuleIndex } from './pushRuleIndex';
import { installInitialSyncTimeout } from './initial-sync-timeout';
import {
  defaultReplayHints,
  installStagedReplay,
  ReplayHints,
  roomIdFromLocation,
} from './staged-replay';
import { readSnapshot } from '../app/features/startup-snapshot/snapshot';
import { getSettings } from '../app/state/settings';
import { installSyncStoreKeeper, noteSavedToken } from './sync-store-keeper';
import { buildLiteFilterDefinition, LITE_FILTER_INLINE_SAFE_ROOMS, LiteOptions } from './lite-mode';
import {
  bypassLiteOnce,
  clearLiteBypass,
  forgetSkippedRooms,
  getSkippedRooms,
  isLiteBypassed,
  liteOptionsFromSettings,
  LiteReport,
  pruneDormantRooms,
  SYNC_DB_NAME,
} from './lite-store';

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
    dbName: SYNC_DB_NAME,
    ...(useWorker
      ? {
          workerFactory: () =>
            new Worker(new URL('./indexeddb-worker.ts', import.meta.url), { type: 'module' }),
        }
      : {}),
  });

const createClientWithStore = (session: Session, store: IndexedDBStore): MatrixClient => {
  const mx = createClient({
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
  // Push-rule matching was ~60 % of the reload on a 9,000-chat account with ~400
  // per-chat rules. Same results, only the rules that can match are checked.
  installPushRuleIndex(mx);
  // The one-time initial /sync takes the server 55-80+ s on this account; the
  // SDK would abort it at 80 s and start over. Only that request waits longer.
  installInitialSyncTimeout(mx);
  return mx;
};

/**
 * What lite mode did on this load — read by the settings screen and by
 * `startClient` (which turns the skipped list into a /sync filter).
 */
let liteState: {
  options: LiteOptions;
  skippedRooms: string[];
  report?: LiteReport;
  /** nothing saved on this device yet: this load is the one-time full one */
  firstLoad: boolean;
} = {
  options: { enabled: false, windowDays: 90, serverFilter: false },
  skippedRooms: [],
  firstLoad: false,
};

export const getLiteState = () => liteState;

/**
 * Staged start-up (client/staged-replay.ts): which rooms the SDK replays first.
 * The hints are read when the replay runs, so they are kept module-level.
 */
let replayHints: ReplayHints = defaultReplayHints();

export const stagedStartupEnabled = (): boolean => getSettings().stagedStartup !== 'off';

const setupStagedStartup = (session: Session): boolean => {
  if (!stagedStartupEnabled()) return false;
  replayHints = {
    ...defaultReplayHints(),
    urlRoomId: roomIdFromLocation(),
    snapshotRoomIds: readSnapshot(session.userId)?.rooms.map((r) => r.id) ?? [],
  };
  // Wraps a private SDK method; a no-op (today's path) when an upstream bump moved it.
  const proto = (SyncApi as unknown as { prototype?: Record<string, unknown> }).prototype;
  const installed = installStagedReplay(proto as Parameters<typeof installStagedReplay>[0], {
    getHints: () => replayHints,
  });
  if (!installed && !(proto as { __cinnyStaged?: boolean } | undefined)?.__cinnyStaged) {
    // eslint-disable-next-line no-console
    console.warn('staged startup: SDK method missing, running unstaged');
  }
  return installed;
};

export const initClient = async (session: Session): Promise<MatrixClient> => {
  // BEFORE the store is opened: delete the chats that have gone quiet from the
  // persisted /sync record, so the SDK never replays them. See client/lite-store.ts.
  const liteOptions = liteOptionsFromSettings();
  const bypassed = isLiteBypassed();
  const { skippedRooms, report, enabled, windowDays, firstLoad } = await pruneDormantRooms(
    liteOptions
  );
  if (bypassed) {
    // "Show older chats" was a one-shot: everything is loaded this time, and the
    // skipped list is dropped so nothing is filtered out either.
    forgetSkippedRooms();
    clearLiteBypass();
  }
  // `enabled` is the effective decision (auto mode turns itself on for big accounts).
  // A load that skipped nothing new but has chats skipped earlier still needs the
  // wake-up watcher, so `enabled` stays true whenever anything is left out.
  liteState = {
    options: {
      ...liteOptions,
      enabled: enabled || (!bypassed && skippedRooms.length > 0),
      windowDays,
    },
    skippedRooms,
    report,
    firstLoad: !!firstLoad,
  };

  setupStagedStartup(session);

  let indexedDBStore = createSyncStore(true);
  let mx = createClientWithStore(session, indexedDBStore);

  // The sync store (worker reads the saved record) and the rust crypto init
  // (wasm compile + its own IndexedDB database) are independent: run them in
  // parallel instead of one after the other — ~1 s off a warm start.
  const cryptoReady = mx.initRustCrypto();
  try {
    await Promise.all([indexedDBStore.startup(), cryptoReady]);
  } catch (err) {
    // The worker could not be started (unsupported runtime, blocked by a CSP,
    // failed chunk load, ...) — or crypto failed. Fall back to the previous
    // main-thread store rather than failing to load the app at all. Nothing
    // has synced yet, so it is safe to rebuild both; the in-flight crypto init
    // is awaited and stopped first so two crypto backends never share a store.
    // eslint-disable-next-line no-console
    console.error('initMatrix: IndexedDB worker store failed, falling back to main thread', err);
    await cryptoReady.catch(() => undefined);
    try {
      mx.stopClient();
    } catch {
      // ignore
    }
    try {
      await indexedDBStore.destroy();
    } catch {
      // ignore
    }
    indexedDBStore = createSyncStore(false);
    mx = createClientWithStore(session, indexedDBStore);
    await indexedDBStore.startup();
    await mx.initRustCrypto();
  }

  // save the record when the tab goes away; remember a degraded store; start-up report
  installSyncStoreKeeper(mx, indexedDBStore);
  indexedDBStore
    .getSavedSyncToken()
    .then((token) => noteSavedToken(!!token))
    .catch(() => noteSavedToken(false));

  mx.setMaxListeners(50);

  return mx;
};

/**
 * Build the /sync filter that tells the homeserver to leave the skipped chats
 * out, or `undefined` when it should not be used.
 *
 * Guard: on the very first sync of an empty store matrix-js-sdk inlines the
 * filter into the /sync query string, which thousands of room IDs would blow
 * past any URL limit. That path only happens when there is no saved sync token,
 * so we require one.
 */
const buildLiteSyncFilter = async (mx: MatrixClient): Promise<Filter | undefined> => {
  const { options } = liteState;
  if (!options.enabled || !options.serverFilter) return undefined;
  const skipped = getSkippedRooms();
  if (skipped.length === 0) return undefined;
  if (skipped.length > LITE_FILTER_INLINE_SAFE_ROOMS) {
    const savedToken = await mx.store.getSavedSyncToken();
    if (!savedToken) return undefined;
  }
  const filter = new Filter(mx.getUserId());
  filter.setDefinition(buildLiteFilterDefinition(skipped));
  return filter;
};

export const startClient = async (mx: MatrixClient) => {
  const filter = await buildLiteSyncFilter(mx);
  await mx.startClient({
    lazyLoadMembers: true,
    ...(filter ? { filter } : {}),
  });
};

export const clearCacheAndReload = async (mx: MatrixClient) => {
  mx.stopClient();
  clearNavToActivePathStore(mx.getSafeUserId());
  await mx.store.deleteAllData();
  window.location.reload();
};

/**
 * Lite mode: bring every chat back, once.
 *
 * The skipped chats were deleted from the saved copy, and an incremental /sync
 * will not re-send a chat that nothing has happened in — so the only honest way
 * to see them all again is to drop the saved copy and let the server send
 * everything. That is the slow load again (minutes on a 9,000-chat account).
 * Lite mode stays on, so the load after this one is lean again.
 */
export const loadAllChatsOnce = async (mx: MatrixClient) => {
  bypassLiteOnce();
  forgetSkippedRooms();
  await clearCacheAndReload(mx);
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
