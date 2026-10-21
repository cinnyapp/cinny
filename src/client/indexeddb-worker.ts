/*
 * Web-worker entry point for matrix-js-sdk's IndexedDB sync store.
 *
 * Running the sync store in a worker keeps the (very large) persisted /sync
 * accumulator off the main thread: reading it out of IndexedDB, re-accumulating
 * it, serialising it back on every save, and — most importantly — the
 * `deepCopy()` (JSON.stringify + JSON.parse) that
 * `LocalIndexedDBStoreBackend.getSavedSync()` performs on the whole blob.
 *
 * See Element Web's src/workers/indexeddb-worker.ts, which does the same.
 *
 * On top of the SDK's commands it answers the staged-transfer commands
 * (client/staged-transfer.ts): the saved record in parts, newest chats first.
 */
/// <reference lib="webworker" />
import { IndexedDBStoreWorker } from 'matrix-js-sdk/lib/indexeddb-worker';
import { handleStagedCommand } from './staged-transfer';
import type { StagedBackendLike } from './staged-transfer';

const ctx = globalThis as unknown as DedicatedWorkerGlobalScope;

const remoteWorker = new IndexedDBStoreWorker(ctx.postMessage.bind(ctx));

ctx.onmessage = (ev: MessageEvent) => {
  const handled = handleStagedCommand(
    ev.data,
    // the SDK keeps its backend in a private field (set by "setupWorker")
    () => (remoteWorker as unknown as { backend?: StagedBackendLike }).backend,
    (reply) => ctx.postMessage(reply)
  );
  if (!handled) remoteWorker.onMessage(ev);
};
