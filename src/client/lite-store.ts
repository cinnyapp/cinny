/**
 * Lite mode, part 2: the IndexedDB surgery.
 *
 * matrix-js-sdk keeps the whole persisted /sync blob as a SINGLE record in the
 * `sync` object store (`{ clobber: '-', nextBatch, roomsData }`, see
 * `LocalIndexedDBStoreBackend.persistSyncData`). On startup it reads that record
 * and feeds it to the `SyncAccumulator`, and everything in it is then replayed
 * through `processSyncResponse()` — the ~100 s "Heating up".
 *
 * So the cheapest possible way to "not even load the old chats" is to delete
 * them from that record *before* the SDK opens the store. `nextBatch` is kept,
 * which matters: the SDK then does an **incremental** sync from where it left
 * off instead of re-downloading all 9,000 rooms.
 *
 * The prune is sticky by construction — the accumulator is seeded from the
 * pruned record, so the next `persistSyncData()` writes the pruned set back.
 * A skipped room returns by itself the moment /sync mentions it again.
 */

import { getSettings } from '../app/state/settings';
import {
  classifyRooms,
  LiteOptions,
  LiteRoomsSyncData,
  normalizeLiteOptions,
  liteChoiceFromSettings,
  pruneRoomsData,
  resolveAutoLite,
  unionRoomIds,
} from './lite-mode';

export const SYNC_DB_NAME = 'web-sync-store';
/**
 * The real IndexedDB database name. matrix-js-sdk prefixes whatever `dbName`
 * you give `IndexedDBStore` with `matrix-js-sdk:`
 * (`LocalIndexedDBStoreBackend`), so the raw open has to use the prefixed name.
 */
const SYNC_IDB_NAME = `matrix-js-sdk:${SYNC_DB_NAME}`;
const SYNC_STORE = 'sync';
const SYNC_CLOBBER = '-';
/**
 * The `sync` store is created with `keyPath: ['clobber']` — a compound key of
 * one component — so the record's key is the ARRAY `['-']`, not the string.
 */
const SYNC_KEY = [SYNC_CLOBBER];

const SKIPPED_KEY = 'cinny_lite_skipped_rooms';
const REPORT_KEY = 'cinny_lite_report';
const BYPASS_KEY = 'cinny_lite_show_all';
const LAST_PRUNE_KEY = 'cinny_lite_last_prune';
const NOTICE_KEY = 'cinny_lite_notice_seen';
/**
 * Reading the saved chats to tidy them costs a full read of the store on the
 * main thread (seconds on a big account) on top of the SDK's own read. Chats go
 * quiet over days, so once tidied, the next few hours of reloads skip it.
 */
const PRUNE_EVERY_MS = 12 * 60 * 60 * 1000;

export type LiteReport = {
  at: number;
  windowDays: number;
  /** Lite mode switched itself on because the account is big. */
  auto?: boolean;
  /** Chats left out in total (this load and earlier ones). */
  skippedTotal?: number;
  totalRooms: number;
  keptRooms: number;
  skippedRooms: number;
  skippedEvents: number;
  keptEvents: number;
  keptBecause: Record<string, number>;
  ms: number;
  /** Why nothing was done, when nothing was done. */
  note?: string;
};

export const liteOptionsFromSettings = (): LiteOptions => {
  const settings = getSettings();
  return normalizeLiteOptions({
    enabled: settings.liteMode,
    choice: liteChoiceFromSettings(settings.liteModeChoice, settings.liteMode),
    windowDays: settings.liteWindowDays,
    serverFilter: settings.liteServerFilter,
  });
};

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota — the list is an optimisation, not state we cannot live without
  }
};

/**
 * In-memory copy of the skipped list. `ClientEvent.Room` fires once per chat
 * while the saved chats are replayed, and the wake-up watcher asks "is this a
 * skipped chat?" every time — re-parsing a 6,000-id JSON list from
 * localStorage per chat was quadratic.
 */
let skippedCache: { list: string[]; set: Set<string> } | undefined;

/** Every room lite mode has skipped so far (cumulative across loads). */
export const getSkippedRooms = (): string[] => {
  if (!skippedCache) {
    const list = readJson<string[]>(SKIPPED_KEY, []);
    skippedCache = { list, set: new Set(list) };
  }
  return skippedCache.list;
};
export const isSkippedRoom = (roomId: string): boolean => {
  getSkippedRooms();
  return skippedCache?.set.has(roomId) ?? false;
};
export const setSkippedRooms = (roomIds: string[]): void => {
  skippedCache = { list: roomIds, set: new Set(roomIds) };
  writeJson(SKIPPED_KEY, roomIds);
};
export const forgetSkippedRooms = (): void => {
  skippedCache = { list: [], set: new Set() };
  try {
    localStorage.removeItem(SKIPPED_KEY);
    localStorage.removeItem(LAST_PRUNE_KEY);
  } catch {
    // ignore
  }
};

/** The one-line "old chats are not loaded" notice is shown once. */
export const isLiteNoticeSeen = (): boolean => {
  try {
    return localStorage.getItem(NOTICE_KEY) === '1';
  } catch {
    return true;
  }
};
export const markLiteNoticeSeen = (): void => {
  try {
    localStorage.setItem(NOTICE_KEY, '1');
  } catch {
    // ignore
  }
};

type LastPrune = { at: number; windowDays: number; auto: boolean; totalRooms: number };

export const getLiteReport = (): LiteReport | undefined =>
  readJson<LiteReport | undefined>(REPORT_KEY, undefined);
const setLiteReport = (report: LiteReport): void => writeJson(REPORT_KEY, report);

/**
 * "Show older chats" sets this for one load only: the next page load keeps
 * everything and does not apply a server filter.
 */
export const isLiteBypassed = (): boolean => {
  try {
    return sessionStorage.getItem(BYPASS_KEY) === '1';
  } catch {
    return false;
  }
};
export const bypassLiteOnce = (): void => {
  try {
    sessionStorage.setItem(BYPASS_KEY, '1');
  } catch {
    // ignore
  }
};
export const clearLiteBypass = (): void => {
  try {
    sessionStorage.removeItem(BYPASS_KEY);
  } catch {
    // ignore
  }
};

const idbRequest = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const txDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    const req = transaction;
    req.oncomplete = () => resolve();
    req.onerror = () => reject(req.error);
    req.onabort = () => reject(req.error);
  });

/**
 * Open an EXISTING database without touching its version.
 *
 * Opening with no version on a database that does not exist would create an
 * empty one at version 1, and matrix-js-sdk would then "upgrade" it from 1 and
 * skip the migration that creates its object stores — a broken store. So we
 * refuse to create: if `onupgradeneeded` fires from version 0 we abort, which
 * rolls the creation back.
 */
const openExistingDb = (dbName: string): Promise<IDBDatabase | undefined> =>
  new Promise((resolve, reject) => {
    let created = false;
    const req = indexedDB.open(dbName);
    req.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) {
        created = true;
        req.transaction?.abort();
      }
    };
    req.onsuccess = () => {
      if (created) {
        req.result.close();
        indexedDB.deleteDatabase(dbName);
        resolve(undefined);
        return;
      }
      resolve(req.result);
    };
    req.onerror = () => {
      if (created) {
        indexedDB.deleteDatabase(dbName);
        resolve(undefined);
        return;
      }
      reject(req.error);
    };
    req.onblocked = () => resolve(undefined);
  });

const skip = (note: string, windowDays: number, ms = 0): LiteReport => {
  const report: LiteReport = {
    at: Date.now(),
    windowDays,
    totalRooms: 0,
    keptRooms: 0,
    skippedRooms: 0,
    skippedEvents: 0,
    keptEvents: 0,
    keptBecause: {},
    ms,
    note,
  };
  writeJson(REPORT_KEY, report);
  return report;
};

export type LitePruneResult = {
  /** Rooms that are now absent from the store (cumulative, for the filter). */
  skippedRooms: string[];
  report: LiteReport;
  /** Whether lite mode actually applies to this load (auto mode decides here). */
  enabled: boolean;
  windowDays: number;
};

const choiceOf = (options: LiteOptions) => options.choice ?? (options.enabled ? 'on' : 'off');

/**
 * Drop every quiet room from the persisted /sync record.
 *
 * Must be called BEFORE `new IndexedDBStore(...).startup()` — once the store
 * (or its worker) has read the record, the in-memory accumulator is the source
 * of truth and would just write everything back.
 *
 * In `auto` mode the decision is made here, from the number of saved chats.
 */
export const pruneDormantRooms = async (
  options: LiteOptions,
  protect: string[] = []
): Promise<LitePruneResult> => {
  const started = performance.now();
  const previous = getSkippedRooms();
  const choice = choiceOf(options);
  const off = (report: LiteReport, windowDays = options.windowDays): LitePruneResult => ({
    skippedRooms: previous,
    report,
    enabled: false,
    windowDays,
  });

  if (choice === 'off') {
    return off(skip('lite mode off', options.windowDays));
  }
  if (isLiteBypassed()) {
    // one-shot "show everything": also forget the list so the server filter is
    // not applied either
    try {
      localStorage.removeItem(LAST_PRUNE_KEY);
    } catch {
      // ignore
    }
    return {
      skippedRooms: [],
      report: skip('showing all chats for this load', options.windowDays),
      enabled: false,
      windowDays: options.windowDays,
    };
  }

  // Tidied recently with the same settings: nothing new can have gone quiet
  // yet, so do not pay for reading the whole store again.
  const wantAuto = choice === 'auto';
  const last = readJson<LastPrune | undefined>(LAST_PRUNE_KEY, undefined);
  if (
    last &&
    Date.now() - last.at < PRUNE_EVERY_MS &&
    last.at <= Date.now() &&
    last.auto === wantAuto
  ) {
    const resolved = resolveAutoLite(options, last.totalRooms);
    if (resolved.windowDays === last.windowDays) {
      const lastReport = getLiteReport();
      if (!resolved.enabled) {
        return off(lastReport ?? skip('small account — everything is loaded', resolved.windowDays));
      }
      return {
        skippedRooms: previous,
        report: lastReport ?? skip('tidied recently', resolved.windowDays),
        enabled: true,
        windowDays: resolved.windowDays,
      };
    }
  }

  let db: IDBDatabase | undefined;
  try {
    db = await openExistingDb(SYNC_IDB_NAME);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('lite mode: could not open the sync store, loading everything', err);
    return {
      skippedRooms: previous,
      report: skip('could not open the saved chats', options.windowDays),
      enabled: choice === 'on' || previous.length > 0,
      windowDays: options.windowDays,
    };
  }
  if (!db) {
    // first ever load on this device: nothing saved yet, so there is nothing to
    // skip. The next load will be the fast one.
    return {
      skippedRooms: previous,
      report: skip('nothing saved yet — first load is always the slow one', options.windowDays),
      enabled: choice === 'on',
      windowDays: options.windowDays,
    };
  }

  try {
    if (!db.objectStoreNames.contains(SYNC_STORE)) {
      return off(skip('saved chats not in the expected shape', options.windowDays));
    }

    const readTx = db.transaction([SYNC_STORE], 'readonly');
    const record = (await idbRequest(
      readTx.objectStore(SYNC_STORE).get(SYNC_KEY) as IDBRequest<
        { clobber: string; nextBatch: string; roomsData: LiteRoomsSyncData } | undefined
      >
    )) as { clobber: string; nextBatch: string; roomsData: LiteRoomsSyncData } | undefined;
    await txDone(readTx).catch(() => undefined);

    if (!record?.roomsData?.join || !record.nextBatch) {
      return {
        skippedRooms: previous,
        report: skip('nothing saved yet — first load is always the slow one', options.windowDays),
        enabled: choice === 'on',
        windowDays: options.windowDays,
      };
    }

    const { join } = record.roomsData;
    const totalRooms = Object.keys(join).length;
    // chats skipped on earlier loads are no longer in the record, but they are
    // still part of the account
    const accountRooms = totalRooms + previous.filter((id) => !(id in join)).length;
    const resolved = resolveAutoLite(options, accountRooms);
    const lastPrune: LastPrune = {
      at: Date.now(),
      windowDays: resolved.windowDays,
      auto: resolved.auto,
      totalRooms: accountRooms,
    };
    if (!resolved.enabled) {
      writeJson(LAST_PRUNE_KEY, lastPrune);
      return off(
        skip(
          `${accountRooms.toLocaleString()} chats — few enough to load them all`,
          resolved.windowDays
        ),
        resolved.windowDays
      );
    }

    const classification = classifyRooms(record.roomsData, {
      windowDays: resolved.windowDays,
      protect,
    });

    const skippedRooms = unionRoomIds(previous, classification.dormant);

    if (classification.dormant.length > 0) {
      const prunedRoomsData = pruneRoomsData(record.roomsData, classification.dormant);
      const writeTx = db.transaction([SYNC_STORE], 'readwrite');
      writeTx.objectStore(SYNC_STORE).put({
        clobber: SYNC_CLOBBER,
        nextBatch: record.nextBatch,
        roomsData: prunedRoomsData,
      });
      await txDone(writeTx);
      setSkippedRooms(skippedRooms);
    }
    writeJson(LAST_PRUNE_KEY, lastPrune);

    const report: LiteReport = {
      at: Date.now(),
      windowDays: resolved.windowDays,
      auto: resolved.auto,
      skippedTotal: skippedRooms.length,
      totalRooms,
      keptRooms: classification.kept.length,
      skippedRooms: classification.dormant.length,
      skippedEvents: classification.dormantEvents,
      keptEvents: classification.keptEvents,
      keptBecause: classification.keptBecause,
      ms: Math.round(performance.now() - started),
    };
    setLiteReport(report);
    return { skippedRooms, report, enabled: true, windowDays: resolved.windowDays };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('lite mode: prune failed, loading everything', err);
    return {
      skippedRooms: previous,
      report: skip('could not skip the old chats this time', options.windowDays),
      enabled: previous.length > 0,
      windowDays: options.windowDays,
    };
  } finally {
    db.close();
  }
};
