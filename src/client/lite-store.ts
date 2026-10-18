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
  pruneRoomsData,
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

export type LiteReport = {
  at: number;
  windowDays: number;
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

/** Every room lite mode has skipped so far (cumulative across loads). */
export const getSkippedRooms = (): string[] => readJson<string[]>(SKIPPED_KEY, []);
export const setSkippedRooms = (roomIds: string[]): void => writeJson(SKIPPED_KEY, roomIds);
export const forgetSkippedRooms = (): void => {
  try {
    localStorage.removeItem(SKIPPED_KEY);
  } catch {
    // ignore
  }
};

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
};

/**
 * Drop every quiet room from the persisted /sync record.
 *
 * Must be called BEFORE `new IndexedDBStore(...).startup()` — once the store
 * (or its worker) has read the record, the in-memory accumulator is the source
 * of truth and would just write everything back.
 */
export const pruneDormantRooms = async (
  options: LiteOptions,
  protect: string[] = []
): Promise<LitePruneResult> => {
  const started = performance.now();
  const previous = getSkippedRooms();

  if (!options.enabled) {
    return { skippedRooms: previous, report: skip('lite mode off', options.windowDays) };
  }
  if (isLiteBypassed()) {
    // one-shot "show everything": also forget the list so the server filter is
    // not applied either
    return {
      skippedRooms: [],
      report: skip('showing all chats for this load', options.windowDays),
    };
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
    };
  }
  if (!db) {
    // first ever load on this device: nothing saved yet, so there is nothing to
    // skip. The next load will be the fast one.
    return {
      skippedRooms: previous,
      report: skip('nothing saved yet — first load is always the slow one', options.windowDays),
    };
  }

  try {
    if (!db.objectStoreNames.contains(SYNC_STORE)) {
      return {
        skippedRooms: previous,
        report: skip('saved chats not in the expected shape', options.windowDays),
      };
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
      };
    }

    const totalRooms = Object.keys(record.roomsData.join).length;
    const classification = classifyRooms(record.roomsData, {
      windowDays: options.windowDays,
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

    const report: LiteReport = {
      at: Date.now(),
      windowDays: options.windowDays,
      totalRooms,
      keptRooms: classification.kept.length,
      skippedRooms: classification.dormant.length,
      skippedEvents: classification.dormantEvents,
      keptEvents: classification.keptEvents,
      keptBecause: classification.keptBecause,
      ms: Math.round(performance.now() - started),
    };
    setLiteReport(report);
    return { skippedRooms, report };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('lite mode: prune failed, loading everything', err);
    return {
      skippedRooms: previous,
      report: skip('could not skip the old chats this time', options.windowDays),
    };
  } finally {
    db.close();
  }
};
