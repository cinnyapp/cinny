#!/usr/bin/env node
/**
 * Lite mode after the app's own "Clear Cache" (2026-10-21 verifier, round 2):
 *  1. the load after it is the one-time full load (cold prune + honest note),
 *     even though the "tidied recently" stamp from before is still there;
 *  2. the chats that arrive in that initial /sync are not "wake-ups": no
 *     GET /rooms/{id}/state storm (7,219 in one load), the skipped list stays;
 *  3. the skipped list stays accurate, so lean mode survives.
 *   npm run test:lite-wake
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

// ---- browser storage shims (before the modules are loaded) -----------------
const makeStorage = () => {
  const m = new Map();
  const writes = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      m.set(k, String(v));
      writes.set(k, (writes.get(k) ?? 0) + 1);
    },
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    writesOf: (k) => writes.get(k) ?? 0,
    resetWrites: () => writes.clear(),
  };
};
globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();

// ---- a minimal IndexedDB: what lite-store touches, nothing more ------------
const later = (fn, ms = 0) => setTimeout(fn, ms);
const clone = (v) => (v === undefined ? undefined : structuredClone(v));
class FakeIDB {
  constructor() {
    this.dbs = new Map();
    this.reads = 0;
    this.counts = 0;
  }

  seed(name, record) {
    const sync = new Map();
    if (record) sync.set(JSON.stringify(['-']), clone(record));
    this.dbs.set(name, { stores: new Map([['sync', sync]]) });
  }

  record(name) {
    return this.dbs
      .get(name)
      ?.stores.get('sync')
      ?.get(JSON.stringify(['-']));
  }

  open(name) {
    const req = {};
    later(() => {
      if (!this.dbs.has(name)) {
        let aborted = false;
        req.transaction = {
          abort: () => {
            aborted = true;
          },
        };
        req.onupgradeneeded?.({ oldVersion: 0, newVersion: 1 });
        if (aborted) {
          req.error = new Error('AbortError');
          req.onerror?.({});
          return;
        }
        this.dbs.set(name, { stores: new Map() });
      }
      req.result = this.connection(name);
      req.onsuccess?.({});
    });
    return req;
  }

  deleteDatabase(name) {
    this.dbs.delete(name);
    const req = {};
    later(() => req.onsuccess?.({}));
    return req;
  }

  connection(name) {
    const idb = this;
    const db = this.dbs.get(name);
    const request = (fn) => {
      const req = {};
      later(() => {
        req.result = fn();
        req.onsuccess?.({});
      });
      return req;
    };
    return {
      objectStoreNames: { contains: (n) => db.stores.has(n) },
      close() {},
      transaction() {
        const tx = {
          objectStore(n) {
            const st = db.stores.get(n);
            return {
              get: (key) =>
                request(() => {
                  idb.reads += 1;
                  return clone(st.get(JSON.stringify(key)));
                }),
              count: (key) =>
                request(() => {
                  idb.counts += 1;
                  return st.has(JSON.stringify(key)) ? 1 : 0;
                }),
              put: (value) => request(() => st.set(JSON.stringify([value.clobber]), clone(value))),
            };
          },
        };
        // completes after the requests made in it (a few ms, like a real one)
        later(() => tx.oncomplete?.(), 5);
        return tx;
      },
    };
  }
}
const idb = new FakeIDB();
globalThis.indexedDB = idb;
const DB = 'matrix-js-sdk:web-sync-store';

const store = await import('../src/client/lite-store.ts');
const { pruneDormantRooms, installColdPrune, noteCacheCleared, nextSkippedList } = store;
const { setSkippedRooms, getSkippedRooms, forgetSkippedRooms, bypassLiteOnce, clearLiteBypass } =
  store;
const { watchSkippedRooms, MAX_STATE_FETCHES } = await import('../src/client/lite-revive.ts');
const { ClientEvent, SyncState } = await import('matrix-js-sdk');

const LAST_PRUNE = 'cinny_lite_last_prune';
const SKIPPED = 'cinny_lite_skipped_rooms';
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

const room = (messageDaysAgo) => ({
  state: {
    events: [
      { type: 'm.room.create', state_key: '', content: {}, origin_server_ts: NOW - 900 * DAY },
      ...['@me:hs', '@them:hs'].map((id) => ({
        type: 'm.room.member',
        state_key: id,
        sender: id,
        content: { membership: 'join' },
        origin_server_ts: NOW - 900 * DAY,
      })),
    ],
  },
  timeline: {
    events: [
      {
        type: 'm.room.message',
        sender: '@them:hs',
        content: { body: 'hi' },
        origin_server_ts: NOW - messageDaysAgo * DAY,
      },
    ],
    prev_batch: 'p',
  },
  summary: { 'm.joined_member_count': 2 },
});

const AUTO = { enabled: false, choice: 'auto', windowDays: 30, serverFilter: false };
const ON = { enabled: true, choice: 'on', windowDays: 30, serverFilter: false };
const OFF = { enabled: false, choice: 'off', windowDays: 30, serverFilter: false };

const reset = () => {
  idb.dbs.clear();
  idb.reads = 0;
  idb.counts = 0;
  localStorage.clear();
  localStorage.resetWrites();
  sessionStorage.clear();
  forgetSkippedRooms();
};
const tidiedAgo = (ms, extra = {}) =>
  localStorage.setItem(
    LAST_PRUNE,
    JSON.stringify({ at: Date.now() - ms, windowDays: 30, auto: true, totalRooms: 9032, ...extra })
  );
const skippedIds = (n, prefix = '!old') => Array.from({ length: n }, (_, i) => `${prefix}${i}:hs`);

// ---------------------------------------------------------------------------
// 1. the load after "Clear Cache" is the one-time full load
// ---------------------------------------------------------------------------

test('after Clear Cache (store gone, stamp 1 h old) the load is a first load, not "tidied recently"', async () => {
  reset();
  tidiedAgo(60 * 60 * 1000);
  setSkippedRooms(skippedIds(5));
  const res = await pruneDormantRooms(AUTO);
  assert.equal(res.firstLoad, true, 'firstLoad → cold prune + one-time note');
  assert.deepEqual(res.skippedRooms, skippedIds(5), 'the list from before is reported as is');
  assert.equal(idb.dbs.has(DB), false, 'the probe never leaves an empty database behind');
  assert.equal(idb.reads, 0);
});

test('Clear Cache forgets the "tidied at" stamp but keeps the skipped list (name index)', () => {
  reset();
  tidiedAgo(60 * 60 * 1000);
  setSkippedRooms(skippedIds(3));
  noteCacheCleared();
  assert.equal(localStorage.getItem(LAST_PRUNE), null);
  assert.deepEqual(JSON.parse(localStorage.getItem(SKIPPED)), skippedIds(3));
});

test('a saved store + a fresh stamp still takes the cheap path (count only, no record read)', async () => {
  reset();
  idb.seed(DB, { clobber: '-', nextBatch: 's1', roomsData: { join: { '!a:hs': room(1) } } });
  tidiedAgo(60 * 60 * 1000);
  setSkippedRooms(skippedIds(4));
  const res = await pruneDormantRooms(AUTO);
  assert.equal(res.firstLoad, undefined);
  assert.equal(res.enabled, true);
  assert.deepEqual(res.skippedRooms, skippedIds(4));
  assert.equal(idb.counts, 1, 'one key count');
  assert.equal(idb.reads, 0, 'the 13-19 MB record is not read');
});

test('a database without the record (tab closed during the cold load) is a first load', async () => {
  reset();
  idb.seed(DB, undefined);
  tidiedAgo(60 * 60 * 1000);
  const res = await pruneDormantRooms(AUTO);
  assert.equal(res.firstLoad, true);
});

test('lite mode off / "Show older chats" still report a first load (the note), skip nothing', async () => {
  reset();
  const off = await pruneDormantRooms(OFF);
  assert.equal(off.firstLoad, true);
  assert.equal(off.enabled, false);
  reset();
  setSkippedRooms(skippedIds(2));
  bypassLiteOnce();
  const all = await pruneDormantRooms(AUTO);
  clearLiteBypass();
  assert.equal(all.firstLoad, true);
  assert.equal(all.enabled, false);
  assert.deepEqual(all.skippedRooms, []);
  // with a saved store: no first load
  reset();
  idb.seed(DB, { clobber: '-', nextBatch: 's1', roomsData: { join: { '!a:hs': room(1) } } });
  const offSaved = await pruneDormantRooms(OFF);
  assert.equal(offSaved.firstLoad, undefined);
});

test('the 12-hourly prune never lists a chat that is in the saved copy as skipped', async () => {
  reset();
  const join = { '!active:hs': room(1), '!quiet:hs': room(100), '!back:hs': room(2) };
  idb.seed(DB, { clobber: '-', nextBatch: 's1', roomsData: { join } });
  // '!back' was skipped once but is in the saved copy again; '!gone' is not in it
  setSkippedRooms(['!back:hs', '!gone:hs']);
  const res = await pruneDormantRooms(ON);
  assert.equal(res.enabled, true);
  assert.deepEqual(res.skippedRooms, ['!gone:hs', '!quiet:hs']);
  assert.deepEqual(getSkippedRooms(), ['!gone:hs', '!quiet:hs']);
  assert.deepEqual(Object.keys(idb.record(DB).roomsData.join).sort(), ['!active:hs', '!back:hs']);
});

test('nextSkippedList: previous minus what is saved, plus the newly quiet', () => {
  assert.deepEqual(nextSkippedList(['!a', '!b', '!c'], { '!b': {} }, ['!d', '!a']), [
    '!a',
    '!c',
    '!d',
  ]);
});

// ---------------------------------------------------------------------------
// 2. the cold prune after Clear Cache keeps lean mode (and the list accurate)
// ---------------------------------------------------------------------------

test('cold prune after Clear Cache: saved copy lean, skipped list = absent chats only', async () => {
  reset();
  // before Clear Cache: '!was-quiet-now-active' and '!still-quiet' were skipped,
  // '!left' is no longer joined at all
  setSkippedRooms(['!was-quiet-now-active:hs', '!still-quiet:hs', '!left:hs']);
  const join = {
    '!was-quiet-now-active:hs': room(1),
    '!still-quiet:hs': room(200),
    '!active:hs': room(3),
    '!new-quiet:hs': room(90),
  };
  let saved;
  const sdkStore = {
    setSyncData: async (data) => {
      saved = data;
    },
  };
  assert.equal(installColdPrune(sdkStore, ON), true);
  await sdkStore.setSyncData({ nextBatch: 's1', rooms: { join } });
  assert.deepEqual(Object.keys(saved.rooms.join).sort(), [
    '!active:hs',
    '!was-quiet-now-active:hs',
  ]);
  assert.deepEqual(getSkippedRooms(), ['!still-quiet:hs', '!left:hs', '!new-quiet:hs']);
  assert.ok(
    JSON.parse(localStorage.getItem(LAST_PRUNE)).at > 0,
    'stamp written: next load is warm'
  );
});

// ---------------------------------------------------------------------------
// 3. no wake-up storm during the initial /sync
// ---------------------------------------------------------------------------

class FakeClient extends EventEmitter {
  constructor(syncState = null) {
    super();
    this.syncState = syncState;
    this.stateCalls = [];
    this.inFlight = 0;
    this.maxInFlight = 0;
    this.http = { authedRequest: async () => ({ notifications: [] }) };
  }

  getSyncState() {
    return this.syncState;
  }

  setSync(state) {
    this.syncState = state;
    this.emit(ClientEvent.Sync, state, null, {});
  }

  async roomState(roomId) {
    this.stateCalls.push(roomId);
    this.inFlight += 1;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    await new Promise((r) => {
      setTimeout(r, 3);
    });
    this.inFlight -= 1;
    return [];
  }
}
const fakeRoom = (roomId) => ({
  roomId,
  currentState: { setStateEvents() {} },
  recalculate() {},
});
const settle = (ms = 60) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

test('chats arriving before the first PREPARED (initial /sync after Clear Cache) are not wake-ups', async () => {
  reset();
  const skipped = skippedIds(7219);
  setSkippedRooms(skipped);
  localStorage.resetWrites();
  const mx = new FakeClient(null);
  const stop = watchSkippedRooms(mx, false);
  // the initial /sync brings every chat; the SDK may also report a retry first
  mx.setSync(SyncState.Reconnecting);
  skipped.forEach((id) => mx.emit(ClientEvent.Room, fakeRoom(id)));
  ['!x:hs', '!y:hs'].forEach((id) => mx.emit(ClientEvent.Room, fakeRoom(id)));
  await settle();
  assert.equal(mx.stateCalls.length, 0, 'no GET /rooms/{id}/state');
  assert.equal(localStorage.writesOf(SKIPPED), 0, 'the skipped list is not rewritten');
  assert.equal(getSkippedRooms().length, 7219);
  // after PREPARED a skipped chat that shows up IS a wake-up
  mx.setSync(SyncState.Prepared);
  mx.emit(ClientEvent.Room, fakeRoom(skipped[10]));
  await settle();
  assert.deepEqual(mx.stateCalls, [skipped[10]]);
  assert.equal(getSkippedRooms().length, 7218);
  assert.equal(getSkippedRooms().includes(skipped[10]), false);
  // the refetch re-emits the room: not woken twice
  mx.emit(ClientEvent.Room, fakeRoom(skipped[10]));
  await settle();
  assert.equal(mx.stateCalls.length, 1);
  stop();
});

test('a burst of genuine wake-ups: one list write, at most MAX_STATE_FETCHES in flight', async () => {
  reset();
  const skipped = skippedIds(100);
  setSkippedRooms(skipped);
  localStorage.resetWrites();
  const mx = new FakeClient(SyncState.Syncing); // installed late: live at once
  const stop = watchSkippedRooms(mx, false);
  skipped.slice(0, 20).forEach((id) => mx.emit(ClientEvent.Room, fakeRoom(id)));
  await settle(200);
  assert.equal(mx.stateCalls.length, 20);
  assert.ok(mx.maxInFlight <= MAX_STATE_FETCHES, `max in flight ${mx.maxInFlight}`);
  assert.equal(localStorage.writesOf(SKIPPED), 1, 'one write for the burst');
  assert.equal(getSkippedRooms().length, 80);
  stop();
});

test('after teardown nothing is fetched', async () => {
  reset();
  setSkippedRooms(['!a:hs']);
  const mx = new FakeClient(SyncState.Prepared);
  const stop = watchSkippedRooms(mx, false);
  stop();
  mx.emit(ClientEvent.Room, fakeRoom('!a:hs'));
  await settle();
  assert.equal(mx.stateCalls.length, 0);
});
