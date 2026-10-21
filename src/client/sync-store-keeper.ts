/*
 * Keep the saved /sync record fresh and explain a slow start.
 *
 * - matrix-js-sdk persists the accumulated /sync data at most every 5 minutes
 *   (WRITE_DELAY_MS). After an F5 the first live /sync therefore has to catch up
 *   on up to 5 minutes of history. Saving when the tab is hidden or unloaded
 *   makes that catch-up cover seconds instead.
 * - When the store is "degraded" (the saved copy could not be read and was
 *   dropped) the next start is a full one-time load: remember when, so the
 *   loading screen can say so instead of looking stuck.
 * - A small per-load start-up report (`window.__cinnyStartup`, console.info)
 *   so a measurement can prove "no full initial sync" on every run.
 */
import type { IndexedDBStore, MatrixClient } from 'matrix-js-sdk';
import { getReplayState } from './staged-replay';

export const DEGRADED_AT_KEY = 'cinny_sync_store_degraded_at';

export type StartupReport = {
  /** a saved sync token existed (warm start) */
  savedToken: boolean;
  /** ms from navigation start */
  preparedAt?: number;
  firstSyncingAt?: number;
  replay?: ReturnType<typeof getReplayState>;
  degradedAt?: number;
};

const report: StartupReport = { savedToken: false };

export const getStartupReport = (): StartupReport => report;

const expose = () => {
  (globalThis as { __cinnyStartup?: StartupReport }).__cinnyStartup = report;
};

export const noteSavedToken = (present: boolean) => {
  report.savedToken = present;
  try {
    const v = localStorage.getItem(DEGRADED_AT_KEY);
    report.degradedAt = v ? Number(v) || undefined : undefined;
  } catch {
    // ignore
  }
  expose();
};

export const notePrepared = () => {
  if (report.preparedAt !== undefined) return;
  report.preparedAt = Math.round(performance.now());
  report.replay = { ...getReplayState() };
  expose();
};

export const noteFirstSyncing = () => {
  if (report.firstSyncingAt !== undefined) return;
  report.firstSyncingAt = Math.round(performance.now());
  report.replay = { ...getReplayState() };
  expose();
  // eslint-disable-next-line no-console
  console.info('[cinny startup]', JSON.stringify(report));
};

/**
 * Save the sync store when the tab goes away; remember a degraded store.
 * Returns the uninstaller.
 */
export const installSyncStoreKeeper = (mx: MatrixClient, store: IndexedDBStore): (() => void) => {
  const save = () => {
    if (!mx.clientRunning) return;
    if (getReplayState().active) return;
    store.save(true).catch(() => undefined);
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') save();
  };
  const onDegraded = (e: Error) => {
    // eslint-disable-next-line no-console
    console.error('sync store degraded: the saved copy had to be rebuilt', e);
    try {
      localStorage.setItem(DEGRADED_AT_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', onVisibility);
  try {
    store.on('degraded', onDegraded);
  } catch {
    // older/newer SDK without the emitter: nothing to remember
  }
  return () => {
    window.removeEventListener('pagehide', save);
    document.removeEventListener('visibilitychange', onVisibility);
  };
};
