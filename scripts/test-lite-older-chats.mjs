#!/usr/bin/env node
/**
 * Lite mode: "Filter by name" also finds the chats lite mode skipped, and one
 * tap on "Load" brings just that chat back.
 *   npm run test:lite-older
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { classifyRooms, pruneRoomsData } = await import('../src/client/lite-mode.ts');
const {
  makeIndexRow,
  searchLiteIndex,
  mergeIndexRows,
  addToLiteIndex,
  readLiteIndex,
  clearLiteIndexCache,
  idsMissingFromIndex,
  planIndexFill,
  rowsFromNameSnapshot,
  GONE_TS,
  LITE_INDEX_KEY,
} = await import('../src/client/lite-index.ts');
const { reviveSkippedRoom, isReviving } = await import('../src/client/lite-room-load.ts');
const { chatListMembership } = await import('../src/app/utils/chatList.ts');

const NOW = Date.UTC(2026, 9, 20);
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => NOW - n * DAY;

const member = (id, name, avatar) => ({
  type: 'm.room.member',
  state_key: id,
  content: { membership: 'join', displayname: name, ...(avatar ? { avatar_url: avatar } : {}) },
  origin_server_ts: daysAgo(900),
});

/** A stored room as it sits in the saved /sync blob. */
const stored = ({ name, hero, heroName, avatar, heroAvatar, lastMessageDaysAgo, members = 2 }) => ({
  state: {
    events: [
      { type: 'm.room.create', state_key: '', content: {}, origin_server_ts: daysAgo(900) },
      ...(name ? [{ type: 'm.room.name', state_key: '', content: { name } }] : []),
      ...(avatar ? [{ type: 'm.room.avatar', state_key: '', content: { url: avatar } }] : []),
      ...(hero ? [member(hero, heroName, heroAvatar)] : []),
    ],
  },
  timeline: {
    events: [
      {
        type: 'm.room.message',
        sender: '@them:hs',
        content: { body: 'hi' },
        origin_server_ts: daysAgo(lastMessageDaysAgo),
      },
    ],
    prev_batch: 'p',
  },
  summary: { 'm.joined_member_count': members, ...(hero ? { 'm.heroes': [hero] } : {}) },
});

const blob = {
  join: {
    '!recent:hs': stored({ name: 'Anastasia (WA)', lastMessageDaysAgo: 2 }),
    // unnamed 1:1: the contact's own name is the chat's name
    '!old1:hs': stored({
      hero: '@wa_1:hs',
      heroName: 'Anastasia Kowalski',
      heroAvatar: 'mxc://hs/pic1',
      lastMessageDaysAgo: 200,
    }),
    '!old2:hs': stored({
      name: 'Anastasia (Telegram)',
      avatar: 'mxc://hs/grp',
      lastMessageDaysAgo: 400,
    }),
    '!old3:hs': stored({ name: 'Sleepy bike club', lastMessageDaysAgo: 120 }),
    '!old4:hs': stored({ name: 'Ünïcode Crème', lastMessageDaysAgo: 90 }),
  },
};

const fakeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    raw: m,
  };
};

/** What lite mode does at prune time: classify, then write one index row per skipped chat. */
const pruneIntoIndex = (storage) => {
  const { dormant } = classifyRooms(blob, { windowDays: 30, now: NOW });
  addToLiteIndex(
    dormant.map((id) => makeIndexRow(id, blob.join[id])),
    storage
  );
  return { dormant, pruned: pruneRoomsData(blob, dormant) };
};

test('a skipped room is found by name (and the loaded one is not listed twice)', () => {
  clearLiteIndexCache();
  const storage = fakeStorage();
  const { dormant, pruned } = pruneIntoIndex(storage);
  assert.deepEqual(dormant.sort(), ['!old1:hs', '!old2:hs', '!old3:hs', '!old4:hs']);
  assert.deepEqual(
    Object.keys(pruned.join),
    ['!recent:hs'],
    'the skipped rooms are really gone from the store'
  );

  const rows = readLiteIndex(storage);
  // "Anastasia": the unnamed 1:1 (by the contact's name) and the Telegram group, newest first
  const loaded = new Set(['!recent:hs']);
  const found = searchLiteIndex(rows, 'anastasia', { isLoaded: (id) => loaded.has(id) });
  assert.deepEqual(
    found.map((e) => e.id),
    ['!old1:hs', '!old2:hs']
  );
  assert.equal(found[0].name, 'Anastasia Kowalski');
  assert.equal(found[0].avatar, 'mxc://hs/pic1', 'the contact picture is kept for the row');
  assert.equal(found[1].avatar, 'mxc://hs/grp');
  assert.ok(found[0].ts > found[1].ts, 'newest chat first');
  assert.equal(found[0].ts, daysAgo(200), 'time of the last message');

  // case + accents ignored, like the loaded list's filter
  assert.deepEqual(
    searchLiteIndex(rows, 'UNICODE creme').map((e) => e.id),
    ['!old4:hs']
  );
  assert.deepEqual(searchLiteIndex(rows, 'zzz'), []);
  assert.deepEqual(searchLiteIndex(rows, '   '), [], 'no query, no older chats');
});

test('rows survive a restart (stored compactly) and chats we could not read keep their old name', () => {
  clearLiteIndexCache();
  const storage = fakeStorage();
  pruneIntoIndex(storage);
  clearLiteIndexCache(); // new page load
  const rows = readLiteIndex(storage);
  assert.equal(rows.length, 4);
  assert.ok(storage.raw.get(LITE_INDEX_KEY).length < 600, 'a row is ~100 bytes, not a whole room');

  const merged = mergeIndexRows(rows, [['!old3:hs', '', '', 0]]);
  assert.equal(merged.find((r) => r[0] === '!old3:hs')[1], 'Sleepy bike club');
  assert.deepEqual(idsMissingFromIndex(['!old1:hs', '!never:hs'], rows), ['!never:hs']);
});

test('the older-chats group follows the same Home / Direct rule as the loaded list', () => {
  const f = (direct, hasParent, showAllRooms) => ({ direct, hasParent, showAllRooms });
  assert.equal(chatListMembership('direct', f(true, true, false)), true);
  assert.equal(chatListMembership('direct', f(false, false, true)), false);
  assert.equal(chatListMembership('home', f(false, false, false)), true);
  assert.equal(
    chatListMembership('home', f(false, true, false)),
    false,
    'space child stays out of Home'
  );
  assert.equal(chatListMembership('home', f(true, false, false)), false, '1:1 belongs to Direct');
  assert.equal(
    chatListMembership('home', f(true, true, true)),
    true,
    'show-all puts everything in Home'
  );

  clearLiteIndexCache();
  const storage = fakeStorage();
  pruneIntoIndex(storage);
  const rows = readLiteIndex(storage);
  const direct = new Set(['!old1:hs']);
  const inSpace = new Set(['!old2:hs']);
  const accept = (scope, showAll) => (e) =>
    chatListMembership(scope, {
      direct: direct.has(e.id),
      hasParent: inSpace.has(e.id),
      showAllRooms: showAll,
    });
  assert.deepEqual(
    searchLiteIndex(rows, 'anastasia', { accept: accept('direct', false) }).map((e) => e.id),
    ['!old1:hs']
  );
  assert.deepEqual(
    searchLiteIndex(rows, 'anastasia', { accept: accept('home', false) }).map((e) => e.id),
    []
  );
  assert.deepEqual(
    searchLiteIndex(rows, 'anastasia', { accept: accept('home', true) }).map((e) => e.id),
    ['!old1:hs', '!old2:hs']
  );
});

/** A fake client: getRoom / the two per-chat reads / the SDK's own room builder (processSyncResponse). */
const fakeClient = (serverRooms) => {
  const rooms = new Map();
  const calls = [];
  const syncApi = {
    processed: [],
    async processSyncResponse(syncEventData, data) {
      this.processed.push({ syncEventData, data });
      Object.keys(data.rooms?.join ?? {}).forEach((id) => rooms.set(id, { roomId: id }));
    },
  };
  const forbidden = () =>
    Object.assign(new Error('forbidden'), { httpStatus: 403, errcode: 'M_FORBIDDEN' });
  return {
    calls,
    syncApi,
    getRoom: (id) => rooms.get(id) ?? null,
    roomState: async (id) => {
      calls.push(['GET', `/rooms/${id}/state`]);
      if (!serverRooms[id]) throw forbidden();
      return serverRooms[id].state;
    },
    http: {
      authedRequest: async (method, path, query) => {
        calls.push([method, path, query]);
        const id = decodeURIComponent(path.split('/')[2]);
        if (!serverRooms[id]) throw forbidden();
        const { types } = JSON.parse(query.filter);
        const all = serverRooms[id].timelineNewestFirst;
        const chunk = types ? all.filter((e) => types.includes(e.type)) : all;
        return { chunk: [...chunk], end: 'back_token' };
      },
    },
  };
};

const server = {
  '!old1:hs': {
    state: [
      { type: 'm.room.create', state_key: '', content: {} },
      { type: 'm.room.name', state_key: '', content: { name: 'Anastasia (current name)' } },
      { type: 'm.room.member', state_key: '@me:hs', content: { membership: 'join' } },
      { type: 'm.room.member', state_key: '@wa_1:hs', content: { membership: 'join' } },
    ],
    timelineNewestFirst: [
      {
        type: 'm.room.message',
        event_id: '$new',
        content: { body: 'newest' },
        origin_server_ts: 3,
      },
      {
        type: 'm.room.name',
        state_key: '',
        event_id: '$oldname',
        content: { name: 'Stale old name' },
        origin_server_ts: 2,
      },
      { type: 'm.room.message', event_id: '$old', content: { body: 'older' }, origin_server_ts: 1 },
    ],
  },
};

test('tap "Load": the skipped room comes back with two small reads of that chat, no reload', async () => {
  const mx = fakeClient(server);
  assert.equal(mx.getRoom('!old1:hs'), null, 'not loaded before');

  const pending = reviveSkippedRoom(mx, '!old1:hs');
  assert.equal(isReviving('!old1:hs'), true, 'the wake-up watcher leaves it alone while it loads');
  const room = await pending;
  assert.equal(isReviving('!old1:hs'), false);

  assert.equal(room.roomId, '!old1:hs');
  assert.equal(mx.getRoom('!old1:hs'), room, 'now a normal loaded room');

  // only reads, only this chat: its state and its newest messages; never a whole /sync
  assert.deepEqual(
    mx.calls.map(([method, path]) => `${method} ${decodeURIComponent(path)}`).sort(),
    ['GET /rooms/!old1:hs/messages', 'GET /rooms/!old1:hs/state']
  );
  const messages = mx.calls.find(([, path]) => path.endsWith('/messages'));
  assert.equal(messages[0], 'GET');
  assert.equal(messages[2].dir, 'b');
  assert.equal(messages[2].from, undefined);

  // it went through the SDK's own room builder, as restored data (no notifications), and ONLY that room
  const [processed] = mx.syncApi.processed;
  assert.equal(processed.syncEventData.fromCache, true);
  assert.deepEqual(Object.keys(processed.data.rooms.join), ['!old1:hs']);
  assert.equal(processed.data.account_data, undefined, 'global data untouched');
  const joinData = processed.data.rooms.join['!old1:hs'];
  // current state is given as state_after, so the older "Stale old name" in the timeline cannot win
  assert.equal(joinData['org.matrix.msc4222.state_after'].events.length, 4);
  assert.equal(joinData.state, undefined);
  // real messages, oldest first (the name change in between is state noise, not shown), and a token to scroll further back from
  assert.deepEqual(
    joinData.timeline.events.map((e) => e.event_id),
    ['$old', '$new']
  );
  assert.equal(joinData.timeline.prev_batch, 'back_token');
  assert.equal(joinData.summary['m.joined_member_count'], 2);

  // a second tap does not ask again
  assert.equal(await reviveSkippedRoom(mx, '!old1:hs'), room);
  assert.equal(mx.calls.length, 2);
});

test('"Load" on a chat that is no longer on the account says so', async () => {
  const mx = fakeClient({});
  await assert.rejects(reviveSkippedRoom(mx, '!gone:hs'), /no longer on your account/);
  assert.equal(isReviving('!gone:hs'), false, 'not stuck in "loading"');
  assert.equal(mx.getRoom('!gone:hs'), null);
  assert.equal(mx.syncApi.processed.length, 0, 'nothing half-built');
});

test('a chat with no message at all still opens with what it has', async () => {
  const mx = fakeClient({
    '!quiet:hs': {
      state: [{ type: 'm.room.member', state_key: '@me:hs', content: { membership: 'join' } }],
      timelineNewestFirst: [
        { type: 'm.room.name', state_key: '', event_id: '$n', content: { name: 'Quiet' } },
      ],
    },
  });
  await reviveSkippedRoom(mx, '!quiet:hs');
  const asks = mx.calls.filter(([, path]) => path.endsWith('/messages'));
  assert.equal(asks.length, 2, 'asked again without the message-only filter');
  const [processed] = mx.syncApi.processed;
  assert.deepEqual(
    processed.data.rooms.join['!quiet:hs'].timeline.events.map((e) => e.event_id),
    ['$n']
  );
});

test('chats skipped before the index existed are learned once, in one background read', () => {
  const skipped = ['!a:hs', '!b:hs', '!c:hs'];
  const rows = [['!a:hs', 'Has a name', '', 5]];
  // two chats were skipped without a note of their name
  assert.deepEqual(planIndexFill(skipped, rows, false), { run: true, ids: ['!b:hs', '!c:hs'] });
  // everything known: nothing to do, no request
  const full = [...rows, ['!b:hs', 'B', '', 1], ['!c:hs', 'C', '', 1]];
  assert.deepEqual(planIndexFill(skipped, full, false), { run: false, ids: [] });
  // a row whose name could not be worked out while pruning gets ONE more try per device ...
  const weak = [...full.slice(0, 2), ['!c:hs', '', 'x', 7]];
  assert.deepEqual(planIndexFill(skipped, weak, false), { run: true, ids: ['!c:hs'] });
  assert.deepEqual(
    planIndexFill(skipped, weak, true),
    { run: false, ids: [] },
    '... never a second time'
  );
  // a chat the server no longer lists is remembered as gone, not asked about again
  const gone = [...full.slice(0, 2), ['!c:hs', '', '', GONE_TS]];
  assert.deepEqual(planIndexFill(skipped, gone, false), { run: false, ids: [] });
});

test('what the one background read returns becomes index rows (name, picture, real last message)', () => {
  const join = {
    '!dm:hs': {
      state: {
        events: [
          {
            type: 'm.room.member',
            state_key: '@wa_9:hs',
            content: {
              membership: 'join',
              displayname: 'Anastasia Hapon',
              avatar_url: 'mxc://hs/h',
            },
          },
        ],
      },
      timeline: { events: [{ type: 'm.room.message', origin_server_ts: 1234, content: {} }] },
      summary: { 'm.heroes': ['@wa_9:hs'] },
    },
  };
  const rows = rowsFromNameSnapshot(['!dm:hs', '!left:hs'], join);
  assert.deepEqual(rows[0], ['!dm:hs', 'Anastasia Hapon', 'hs/h', 1234]);
  assert.deepEqual(rows[1], ['!left:hs', '', '', GONE_TS]);
  assert.deepEqual(
    searchLiteIndex(rows, 'hapon').map((e) => e.id),
    ['!dm:hs']
  );
  assert.deepEqual(searchLiteIndex(rows, 'left'), [], 'a gone chat is never offered');
});
