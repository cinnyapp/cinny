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
 */
/// <reference lib="webworker" />
import { IndexedDBStoreWorker } from 'matrix-js-sdk/lib/indexeddb-worker';

const ctx = globalThis as unknown as DedicatedWorkerGlobalScope;

const remoteWorker = new IndexedDBStoreWorker(ctx.postMessage.bind(ctx));

ctx.onmessage = remoteWorker.onMessage;
