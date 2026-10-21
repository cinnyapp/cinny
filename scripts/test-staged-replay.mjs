#!/usr/bin/env node
/**
 * Staged start-up: newest-first, two-stage replay of the saved /sync record.
 *   npm run test:staged-replay
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const {
  planReplayOrder,
  orderSavedSync,
  splitSyncResponse,
  installStagedReplay,
  getReplayState,
  roomIdFromLocation,
  isSmallSpace,
  REPLAY_CHUNK_THRESHOLD,
  REPLAY_DEFAULT_FIRST,
  REPLAY_EVENT,
  REPLAY_MIN_CHUNK,
  REPLAY_MAX_CHUNK,
  defaultReplayHints,
  whenReplayIdle,
  roomsStillPending,
} = await import('../src/client/staged-replay.ts');

const DAY = 86_400_000;
const NOW = 1_760_000_000_000;

const room = ({ daysAgo = 1, space = false, stateEvents = 3 } = {}) => {
  const state = Array.from({ length: stateEvents }, (_, i) => ({
    type: i === 0 ? 'm.room.create' : 'm.space.child',
    state_key: i === 0 ? '' : `!child${i}:hs`,
    content: i === 0 && space ? { type: 'm.space' } : {},
    origin_server_ts: NOW - 400 * DAY,
  }));
  return {
    state: { events: state },
    timeline: {
      events: [{ type: 'm.room.message', origin_server_ts: NOW - daysAgo * DAY, content: {} }],
      prev_batch: 'p',
    },
  };
};

const manyRooms = (n, make = (i) => room({ daysAgo: i + 1 })) =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [`!r${i}:hs`, make(i)]));

const hints = (extra = {}) => ({ ...defaultReplayHints(), ...extra });

test('planReplayOrder: url room, snapshot rooms, small spaces, then newest-first', () => {
  const join = {
    '!old:hs': room({ daysAgo: 300 }),
    '!space-small:hs': room({ daysAgo: 500, space: true, stateEvents: 5 }),
    '!space-giant:hs': room({ daysAgo: 2, space: true, stateEvents: 6519 }),
    '!snapB:hs': room({ daysAgo: 200 }),
    '!newest:hs': room({ daysAgo: 1 }),
    '!snapA:hs': room({ daysAgo: 250 }),
    '!url:hs': room({ daysAgo: 400 }),
    '!mid:hs': room({ daysAgo: 10 }),
  };
  const plan = planReplayOrder(
    join,
    hints({
      urlRoomId: '!url:hs',
      snapshotRoomIds: ['!snapA:hs', '!snapB:hs', '!not-joined:hs'],
      firstCount: 4,
    })
  );
  assert.deepEqual(plan.first, ['!url:hs', '!snapA:hs', '!snapB:hs', '!space-small:hs']);
  // the giant space (6,519 state events) is never promoted and always goes LAST,
  // even though its timeline makes it look like one of the newest rooms
  assert.deepEqual(plan.rest, ['!newest:hs', '!mid:hs', '!old:hs', '!space-giant:hs']);
  assert.equal(plan.first.length + plan.rest.length, Object.keys(join).length);
  const forced = planReplayOrder(
    join,
    hints({ urlRoomId: '!space-giant:hs', snapshotRoomIds: ['!space-giant:hs'], firstCount: 2 })
  );
  assert.deepEqual(forced.first, ['!space-small:hs', '!newest:hs']);
  assert.equal(forced.rest[forced.rest.length - 1], '!space-giant:hs');
});

test('planReplayOrder: recency is stable for ties and first has exactly firstCount', () => {
  const join = manyRooms(10, () => room({ daysAgo: 5 }));
  const plan = planReplayOrder(join, hints({ firstCount: 3 }));
  assert.deepEqual(plan.first, ['!r0:hs', '!r1:hs', '!r2:hs']);
  assert.deepEqual(plan.rest, Object.keys(join).slice(3));
  const small = planReplayOrder(manyRooms(2), hints({ firstCount: 40 }));
  assert.equal(small.first.length, 2);
  assert.equal(small.rest.length, 0);
});

test('isSmallSpace reads the create event, also from msc4222 state_after', () => {
  assert.equal(isSmallSpace(room({ space: true, stateEvents: 10 }), 200), true);
  assert.equal(isSmallSpace(room({ space: true, stateEvents: 201 }), 200), false);
  assert.equal(isSmallSpace(room({ space: false }), 200), false);
  const r = room({ space: true });
  const after = { 'org.matrix.msc4222.state_after': r.state, timeline: r.timeline };
  assert.equal(isSmallSpace(after, 200), true);
});

test('orderSavedSync re-keys join in plan order, same references, invite/leave untouched', () => {
  const join = manyRooms(5);
  const invite = { '!i:hs': { invite_state: { events: [] } } };
  const leave = { '!l:hs': {} };
  const saved = { nextBatch: 'nb', roomsData: { join, invite, leave }, accountData: [] };
  const plan = planReplayOrder(join, hints({ firstCount: 2, urlRoomId: '!r4:hs' }));
  const ordered = orderSavedSync(saved, plan);
  assert.deepEqual(Object.keys(ordered.roomsData.join), [
    '!r4:hs',
    '!r0:hs',
    '!r1:hs',
    '!r2:hs',
    '!r3:hs',
  ]);
  Object.keys(join).forEach((id) => assert.equal(ordered.roomsData.join[id], join[id]));
  assert.equal(ordered.roomsData.invite, invite);
  assert.equal(ordered.roomsData.leave, leave);
  assert.equal(ordered.nextBatch, 'nb');
  // input untouched
  assert.deepEqual(Object.keys(join), ['!r0:hs', '!r1:hs', '!r2:hs', '!r3:hs', '!r4:hs']);
});

test('splitSyncResponse: small responses pass through unchanged', () => {
  const join = manyRooms(REPLAY_CHUNK_THRESHOLD);
  const data = { next_batch: 'nb', rooms: { join } };
  const chunks = splitSyncResponse(data, planReplayOrder(join, hints()));
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0], data);
  assert.deepEqual(splitSyncResponse({ next_batch: 'x' }, { first: [], rest: [] }), [
    { next_batch: 'x' },
  ]);
});

test('splitSyncResponse: chunk 0 carries everything non-join once, later chunks only join', () => {
  const join = manyRooms(400);
  const extras = {
    account_data: { events: [{ type: 'm.direct' }] },
    presence: { events: [{ type: 'm.presence' }] },
    to_device: { events: [{ type: 'm.room_key' }] },
    device_lists: { changed: ['@a:hs'] },
    device_one_time_keys_count: { signed_curve25519: 50 },
  };
  const invite = { '!i:hs': {} };
  const leave = { '!l:hs': {} };
  const knock = { '!k:hs': {} };
  const data = { next_batch: 'nb', ...extras, rooms: { join, invite, leave, knock } };
  const plan = planReplayOrder(join, hints({ firstCount: REPLAY_DEFAULT_FIRST }));
  const chunks = splitSyncResponse(data, plan, 150);
  assert.deepEqual(
    chunks.map((c) => Object.keys(c.rooms.join).length),
    [40, 150, 150, 60]
  );
  // chunk 0: all the extras, exactly once
  Object.keys(extras).forEach((k) => assert.equal(chunks[0][k], extras[k]));
  assert.equal(chunks[0].rooms.invite, invite);
  assert.equal(chunks[0].rooms.leave, leave);
  assert.equal(chunks[0].rooms.knock, knock);
  chunks.slice(1).forEach((c) => {
    assert.deepEqual(Object.keys(c).sort(), ['next_batch', 'rooms']);
    assert.deepEqual(Object.keys(c.rooms), ['join']);
    assert.equal(c.next_batch, 'nb');
  });
  // every room exactly once, in plan order, same references
  const all = chunks.flatMap((c) => Object.keys(c.rooms.join));
  assert.deepEqual(all, plan.first.concat(plan.rest));
  assert.deepEqual([...all].sort(), Object.keys(join).sort());
  all.forEach((id) => {
    const c = chunks.find((ch) => id in ch.rooms.join);
    assert.equal(c.rooms.join[id], join[id]);
  });
  // the input is not mutated
  assert.equal(Object.keys(data.rooms.join).length, 400);
});

/** A fake SyncApi prototype + instance, recording what the original was called with. */
const fakeSyncApi = ({ throwOnCall } = {}) => {
  const calls = [];
  const events = [];
  const proto = {
    async processSyncResponse(syncEventData, data) {
      calls.push({
        fromCache: !!syncEventData.fromCache,
        oldSyncToken: syncEventData.oldSyncToken,
        join: Object.keys(data.rooms?.join ?? {}),
        extras: Object.keys(data).filter((k) => k !== 'rooms' && k !== 'next_batch'),
      });
      if (data.to_device) this.catchingUp = true;
      else this.catchingUp = false;
      if (throwOnCall === calls.length) throw new Error('boom');
    },
  };
  const api = Object.create(proto);
  api.client = { emit: (ev, p) => events.push({ ev, ...p }) };
  api.catchingUp = false;
  return { proto, api, calls, events };
};

test('installStagedReplay: feature-detected, idempotent', () => {
  assert.equal(installStagedReplay(undefined, { getHints: hints }), false);
  assert.equal(installStagedReplay({}, { getHints: hints }), false);
  const { proto } = fakeSyncApi();
  assert.equal(installStagedReplay(proto, { getHints: hints }), true);
  assert.equal(installStagedReplay(proto, { getHints: hints }), false);
  assert.equal(proto.__cinnyStaged, true);
});

test('installStagedReplay: cached replay returns after stage 1, streams the rest, emits first → progress… → done', async () => {
  const { proto, api, calls, events } = fakeSyncApi();
  let yields = 0;
  installStagedReplay(proto, {
    getHints: () => hints({ urlRoomId: '!r399:hs', firstCount: 40 }),
    chunkSize: 150,
    targetChunkMs: 0, // fixed size for a deterministic test
    yieldFn: async () => {
      yields += 1;
    },
  });
  const join = manyRooms(400);
  const data = {
    next_batch: 'nb',
    account_data: { events: [] },
    to_device: { events: [{ type: 'x' }] },
    rooms: { join },
  };
  await api.processSyncResponse({ fromCache: true, nextSyncToken: 'nb' }, data);
  // the SDK gets control back after stage 1: PREPARED + the first live /sync follow at once
  assert.equal(calls.length, 1, 'only stage 1 was processed when the call resolved');
  assert.equal(calls[0].join.length, 40);
  assert.equal(calls[0].join[0], '!r399:hs', 'the URL room is in stage 1');
  assert.deepEqual(calls[0].extras.sort(), ['account_data', 'to_device']);
  assert.equal(getReplayState().active, true);
  assert.equal(getReplayState().background, true);
  await whenReplayIdle();
  assert.deepEqual(
    calls.map((c) => c.join.length),
    [40, 150, 150, 60]
  );
  calls.slice(1).forEach((c) => {
    assert.deepEqual(c.extras, []);
    assert.equal(c.fromCache, true);
  });
  assert.equal(yields, 3, 'one yield before every stage-2 chunk');
  assert.deepEqual(
    events.map((e) => [e.ev, e.stage, e.done, e.total, e.fromCache, e.chunked]),
    [
      [REPLAY_EVENT, 'first', 40, 400, true, true],
      [REPLAY_EVENT, 'progress', 190, 400, true, true],
      [REPLAY_EVENT, 'progress', 340, 400, true, true],
      [REPLAY_EVENT, 'done', 400, 400, true, true],
    ]
  );
  // every room exactly once, in plan order
  const all = calls.flatMap((c) => c.join);
  assert.deepEqual([...all].sort(), Object.keys(join).sort());
  // chunk 0 had to_device → catching up; the saved record's chunks must not flip it back
  assert.equal(api.catchingUp, true);
  const state = getReplayState();
  assert.equal(state.active, false);
  assert.equal(state.done, 400);
  assert.equal(state.total, 400);
  assert.equal(typeof state.startedAt, 'number');
  assert.equal(typeof state.finishedAt, 'number');
  assert.equal(state.lastChunkRooms, 60);
});

test('installStagedReplay: a live /sync during stage 2 replays the rooms it touches first, in one lane', async () => {
  const { proto, api, calls, events } = fakeSyncApi();
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  let yields = 0;
  installStagedReplay(proto, {
    getHints: () => hints({ firstCount: 40 }),
    chunkSize: 100,
    targetChunkMs: 0,
    // the first stage-2 chunk waits until the test lets it go
    yieldFn: async () => {
      yields += 1;
      if (yields === 1) await gate;
    },
  });
  const join = manyRooms(300); // !r0 newest … !r299 oldest → stage 1 = r0..r39
  await api.processSyncResponse({ fromCache: true, nextSyncToken: 'nb' }, { next_batch: 'nb', rooms: { join } });
  assert.equal(calls.length, 1);
  // the live catch-up arrives: it mentions a stage-1 room, two stage-2 rooms and a left room
  const live = {
    next_batch: 'nb2',
    rooms: {
      join: { '!r5:hs': room(), '!r250:hs': room(), '!r120:hs': room() },
      leave: { '!r299:hs': {} },
    },
  };
  assert.deepEqual(roomsStillPending(live, Object.keys(join).slice(40)), ['!r120:hs', '!r250:hs', '!r299:hs']);
  const livePromise = api.processSyncResponse({ oldSyncToken: 'nb', nextSyncToken: 'nb2' }, live);
  release();
  await livePromise;
  // cached copies of the three pending rooms were replayed BEFORE the live delta
  const liveIndex = calls.findIndex((c) => c.oldSyncToken === 'nb');
  assert.ok(liveIndex > 0);
  const pulled = calls[liveIndex - 1];
  assert.equal(pulled.fromCache, true);
  assert.deepEqual([...pulled.join].sort(), ['!r120:hs', '!r250:hs', '!r299:hs']);
  assert.deepEqual(calls[liveIndex].join.sort(), ['!r120:hs', '!r250:hs', '!r5:hs']);
  await whenReplayIdle();
  // every cached room exactly once; the pulled-forward ones are not replayed again
  const cached = calls.filter((c) => c.fromCache).flatMap((c) => c.join);
  assert.deepEqual([...cached].sort(), Object.keys(join).sort());
  assert.equal(new Set(cached).size, cached.length);
  assert.equal(events.at(-1).stage, 'done');
  assert.equal(events.at(-1).done, 300);
  assert.equal(getReplayState().pulledForward, 3);
  assert.equal(getReplayState().active, false);
});

test('installStagedReplay: stage-2 chunk size adapts to the measured work per chunk', async () => {
  const { proto, api, calls } = fakeSyncApi();
  let t = 0;
  const costPerRoom = 4; // ms "measured" per room → 120 ms target = 30 rooms
  const base = proto.processSyncResponse;
  proto.processSyncResponse = async function timedProcessSyncResponse(ev, data) {
    t += Object.keys(data.rooms?.join ?? {}).length * costPerRoom;
    return base.call(this, ev, data);
  };
  installStagedReplay(proto, {
    getHints: () => hints({ firstCount: 10 }),
    chunkSize: 60,
    targetChunkMs: 120,
    yieldFn: async () => {},
    nowFn: () => t,
  });
  await api.processSyncResponse({ fromCache: true }, { next_batch: 'nb', rooms: { join: manyRooms(400) } });
  await whenReplayIdle();
  const sizes = calls.slice(1).map((c) => c.join.length);
  assert.equal(sizes[0], 60, 'starts with chunkSize');
  // 60 rooms took 240 ms → 30; 30 rooms took 120 ms → stays 30
  assert.deepEqual(sizes.slice(1, 4), [30, 30, 30]);
  sizes.forEach((n) => assert.ok(n >= REPLAY_MIN_CHUNK && n <= REPLAY_MAX_CHUNK));
  assert.equal(sizes.reduce((a, b) => a + b, 0), 390);
});

test('installStagedReplay: the cold initial sync (no old token) is chunked newest-first too', async () => {
  const { proto, api, calls, events } = fakeSyncApi();
  installStagedReplay(proto, {
    getHints: hints,
    chunkSize: 999,
    coldChunkSize: 100,
    yieldFn: async () => {},
  });
  const join = manyRooms(250, (i) => room({ daysAgo: 250 - i })); // last key = newest
  await api.processSyncResponse({ nextSyncToken: 'nb' }, { next_batch: 'nb', rooms: { join } });
  assert.deepEqual(
    calls.map((c) => c.join.length),
    [40, 100, 100, 10]
  );
  assert.equal(calls[0].join[0], '!r249:hs');
  assert.equal(events.at(-1).stage, 'done');
  assert.equal(events[0].fromCache, false);
});

test('installStagedReplay: live syncs pass straight through, whole, once', async () => {
  const { proto, api, calls, events } = fakeSyncApi();
  installStagedReplay(proto, { getHints: hints, yieldFn: async () => {} });
  // incremental with few rooms
  await api.processSyncResponse(
    { oldSyncToken: 'a', nextSyncToken: 'b' },
    { next_batch: 'b', rooms: { join: manyRooms(3) } }
  );
  // gappy incremental with MANY rooms: notifEvents must flush in one call
  await api.processSyncResponse(
    { oldSyncToken: 'b', nextSyncToken: 'c' },
    { next_batch: 'c', rooms: { join: manyRooms(500) } }
  );
  assert.deepEqual(
    calls.map((c) => c.join.length),
    [3, 500]
  );
  assert.deepEqual(events, []);
});

test('installStagedReplay: a small cached replay runs once and still emits done', async () => {
  const { proto, api, calls, events } = fakeSyncApi();
  installStagedReplay(proto, { getHints: hints });
  await api.processSyncResponse(
    { fromCache: true },
    { next_batch: 'nb', rooms: { join: manyRooms(7) } }
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(
    events.map((e) => [e.stage, e.done, e.total, e.chunked]),
    [['done', 7, 7, false]]
  );
  assert.equal(getReplayState().active, false);
});

test('installStagedReplay: a stage-2 chunk that throws is skipped, the rest still streams, done is emitted', async () => {
  const { proto, api, calls, events } = fakeSyncApi({ throwOnCall: 2 });
  installStagedReplay(proto, {
    getHints: hints,
    chunkSize: 100,
    targetChunkMs: 0,
    yieldFn: async () => {},
  });
  const errors = [];
  const origError = console.error;
  console.error = (...a) => errors.push(a[0]);
  try {
    await api.processSyncResponse({ fromCache: true }, { next_batch: 'nb', rooms: { join: manyRooms(300) } });
    await whenReplayIdle();
  } finally {
    console.error = origError;
  }
  assert.deepEqual(
    calls.map((c) => c.join.length),
    [40, 100, 100, 60]
  );
  assert.equal(errors.length, 1);
  assert.deepEqual(
    events.map((e) => e.stage),
    ['first', 'progress', 'progress', 'done']
  );
  assert.equal(getReplayState().active, false);
});

test('installStagedReplay: the cold initial sync that throws still ends with done (listeners never hang)', async () => {
  const { proto, api, calls, events } = fakeSyncApi({ throwOnCall: 2 });
  installStagedReplay(proto, { getHints: hints, coldChunkSize: 100, yieldFn: async () => {} });
  await assert.rejects(
    api.processSyncResponse({ nextSyncToken: 'nb' }, { next_batch: 'nb', rooms: { join: manyRooms(300) } }),
    /boom/
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(
    events.map((e) => e.stage),
    ['first', 'done']
  );
  assert.equal(getReplayState().active, false);
});

test('roomIdFromLocation: hash router, path router, space routes, decoding', () => {
  assert.equal(roomIdFromLocation({ hash: '#/home/!abc:hs', pathname: '/cinny-dev/' }), '!abc:hs');
  assert.equal(roomIdFromLocation({ hash: '', pathname: '/direct/%21abc%3Ahs/$ev' }), '!abc:hs');
  assert.equal(
    roomIdFromLocation({ hash: '#/space/!sp:hs/!child:hs', pathname: '/' }),
    '!child:hs'
  );
  assert.equal(roomIdFromLocation({ hash: '#/home', pathname: '/' }), undefined);
  assert.equal(roomIdFromLocation({ hash: '#/space/!sp:hs', pathname: '/' }), undefined);
  assert.equal(roomIdFromLocation(undefined), undefined);
});

// --- initial-sync timeout (client/initial-sync-timeout.ts) -------------------
const { initialSyncTimeoutFor, installInitialSyncTimeout, INITIAL_SYNC_LOCAL_TIMEOUT_MS } =
  await import('../src/client/initial-sync-timeout.ts');

test('initial sync timeout: only /sync without since is raised; everything else untouched', () => {
  assert.equal(initialSyncTimeoutFor('/sync', { filter: 'x', timeout: 0 }, 80_000), INITIAL_SYNC_LOCAL_TIMEOUT_MS);
  assert.equal(initialSyncTimeoutFor('/sync', { filter: 'x', timeout: 0 }, undefined), INITIAL_SYNC_LOCAL_TIMEOUT_MS);
  assert.equal(initialSyncTimeoutFor('/sync', { since: 's1', timeout: 30_000 }, 110_000), 110_000);
  assert.equal(initialSyncTimeoutFor('/sync', { filter: 'x' }, 900_000), 900_000);
  assert.equal(initialSyncTimeoutFor('/rooms/!a/messages', {}, 15_000), 15_000);
  assert.equal(initialSyncTimeoutFor('/rooms/!a/messages', {}, undefined), undefined);
});

test('installInitialSyncTimeout: wraps once, feature-detected, passes other args through', () => {
  const calls = [];
  const http = {
    authedRequest(method, path, qps, body, opts, extra) {
      calls.push({ method, path, qps, body, opts, extra, self: this });
      return 'ok';
    },
  };
  assert.equal(installInitialSyncTimeout({}), false);
  assert.equal(installInitialSyncTimeout({ http: {} }), false);
  assert.equal(installInitialSyncTimeout({ http }), true);
  assert.equal(installInitialSyncTimeout({ http }), false, 'second install is a no-op');
  assert.equal(http.authedRequest('GET', '/sync', { timeout: 0 }, undefined, { localTimeoutMs: 80_000, abortSignal: 'sig' }, 'x'), 'ok');
  assert.equal(calls[0].opts.localTimeoutMs, INITIAL_SYNC_LOCAL_TIMEOUT_MS);
  assert.equal(calls[0].opts.abortSignal, 'sig');
  assert.equal(calls[0].extra, 'x');
  assert.equal(calls[0].self, http);
  const inc = { localTimeoutMs: 110_000 };
  http.authedRequest('GET', '/sync', { since: 's', timeout: 30_000 }, undefined, inc);
  assert.equal(calls[1].opts, inc, 'incremental sync: same opts object, untouched');
  http.authedRequest('GET', '/profile/@a', {}, undefined, undefined);
  assert.equal(calls[2].opts, undefined);
});
