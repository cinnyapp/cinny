#!/usr/bin/env node
/**
 * Unit tests for the chat list v2: what counts as activity, how chats are
 * ordered (backfill, muted chats, unknown chats), and the filter chips.
 *
 *   npm run test:chat-list
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { classifyActivityEvent, computeRoomActivity, mergeRoomActivity, rawEventLike } =
  await import('../src/app/utils/roomActivity.ts');
const { sortChats, unreadFirst, makeChatFilter, detectChatNetwork, nameMatches, isChatFilter } =
  await import('../src/app/utils/chatList.ts');

const ME = '@me:hs';
const ANNA = '@whatsapp_4179:hs';
const NOW = 1_800_000_000_000;

/** A raw event → the ActivityEvent shape. */
const ev = (type, { ts = NOW - 1000, sender = ANNA, content = {}, stateKey, prev } = {}) =>
  rawEventLike({
    type,
    origin_server_ts: ts,
    sender,
    state_key: stateKey,
    content,
    unsigned: prev ? { prev_content: prev } : undefined,
  });
const text = (ts, sender = ANNA, extra = {}) =>
  ev('m.room.message', { ts, sender, content: { msgtype: 'm.text', body: 'hi', ...extra } });

// ---------------------------------------------------------------------------
// 1. The event-type table
// ---------------------------------------------------------------------------
const TABLE = [
  ['text message', ev('m.room.message', { content: { msgtype: 'm.text', body: 'x' } }), 'message'],
  ['image', ev('m.room.message', { content: { msgtype: 'm.image', body: 'x' } }), 'message'],
  ['voice note', ev('m.room.message', { content: { msgtype: 'm.audio', body: 'x' } }), 'message'],
  ['your own message', text(NOW, ME), 'message'],
  [
    'reply',
    text(NOW, ANNA, { 'm.relates_to': { 'm.in_reply_to': { event_id: '$x' } } }),
    'message',
  ],
  ['thread reply', text(NOW, ANNA, { 'm.relates_to': { rel_type: 'm.thread' } }), 'message'],
  ['sticker', ev('m.sticker'), 'message'],
  ['encrypted message', ev('m.room.encrypted', { content: { algorithm: 'x' } }), 'message'],
  ['poll (stable)', ev('m.poll.start'), 'message'],
  ['poll (unstable)', ev('org.matrix.msc3381.poll.start'), 'message'],
  ['call invite', ev('m.call.invite'), 'message'],
  ['call ring notification', ev('org.matrix.msc4075.rtc.notification'), 'message'],
  ['notice from a person', ev('m.room.message', { content: { msgtype: 'm.notice' } }), 'message'],
  ['room created', ev('m.room.create', { stateKey: '' }), 'start'],
  [
    'you joined',
    ev('m.room.member', { sender: ME, stateKey: ME, content: { membership: 'join' } }),
    'start',
  ],
  [
    'you were invited',
    ev('m.room.member', { stateKey: ME, content: { membership: 'invite' } }),
    'start',
  ],
  // ---- never moves a chat ----
  ['edit', text(NOW, ANNA, { 'm.relates_to': { rel_type: 'm.replace', event_id: '$x' } }), 'none'],
  [
    'reaction',
    ev('m.reaction', { content: { 'm.relates_to': { rel_type: 'm.annotation' } } }),
    'none',
  ],
  [
    'encrypted edit (relation stays in clear)',
    ev('m.room.encrypted', { content: { 'm.relates_to': { rel_type: 'm.replace' } } }),
    'none',
  ],
  [
    'encrypted reaction',
    ev('m.room.encrypted', { content: { 'm.relates_to': { rel_type: 'm.annotation' } } }),
    'none',
  ],
  [
    'bridge bot notice',
    ev('m.room.message', { sender: '@whatsappbot:hs', content: { msgtype: 'm.notice' } }),
    'none',
  ],
  ['profile picture change (room avatar)', ev('m.room.avatar', { stateKey: '' }), 'none'],
  ['rename', ev('m.room.name', { stateKey: '' }), 'none'],
  ['topic', ev('m.room.topic', { stateKey: '' }), 'none'],
  ['power levels', ev('m.room.power_levels', { stateKey: '' }), 'none'],
  ['pinned events', ev('m.room.pinned_events', { stateKey: '' }), 'none'],
  ['m.bridge', ev('m.bridge', { stateKey: 'x' }), 'none'],
  ['uk.half-shot.bridge', ev('uk.half-shot.bridge', { stateKey: 'x' }), 'none'],
  ['beeper room features', ev('com.beeper.room_features', { stateKey: '' }), 'none'],
  ['disappearing timer', ev('com.beeper.disappearing_timer', { stateKey: '' }), 'none'],
  ['deletion', ev('m.room.redaction'), 'none'],
  ['poll vote', ev('org.matrix.msc3381.poll.response'), 'none'],
  ['typing', ev('m.typing'), 'none'],
  ['receipt', ev('m.receipt'), 'none'],
  [
    'someone else joins',
    ev('m.room.member', { stateKey: ANNA, content: { membership: 'join' } }),
    'none',
  ],
  [
    'contact changes their profile picture (member event)',
    ev('m.room.member', {
      stateKey: ANNA,
      content: { membership: 'join', avatar_url: 'mxc://b' },
      prev: { membership: 'join', avatar_url: 'mxc://a' },
    }),
    'none',
  ],
  [
    'your own profile change',
    ev('m.room.member', {
      sender: ME,
      stateKey: ME,
      content: { membership: 'join', displayname: 'New' },
      prev: { membership: 'join', displayname: 'Old' },
    }),
    'none',
  ],
];

TABLE.forEach(([name, event, expected]) => {
  test(`event table: ${name} → ${expected}`, () => {
    assert.equal(classifyActivityEvent(event, ME), expected);
  });
});

// ---------------------------------------------------------------------------
// 2. Activity of one chat
// ---------------------------------------------------------------------------
test('a DM whose only new event is an avatar change keeps its last-message time', () => {
  const a = computeRoomActivity(
    [
      text(NOW - 3_600_000),
      ev('m.room.member', {
        stateKey: ANNA,
        ts: NOW - 60_000,
        content: { membership: 'join', avatar_url: 'mxc://new' },
        prev: { membership: 'join', avatar_url: 'mxc://old' },
      }),
      ev('m.room.avatar', { stateKey: '', ts: NOW - 30_000 }),
    ],
    ME,
    NOW
  );
  assert.deepEqual(a, { ts: NOW - 3_600_000, mine: 0, known: true });
});

test('backfill: old messages appended after a newer one do not count as new', () => {
  const a = computeRoomActivity(
    [text(NOW - 10_000), text(NOW - 86_400_000 * 300), text(NOW - 86_400_000 * 200)],
    ME,
    NOW
  );
  assert.equal(a.ts, NOW - 10_000, 'the newest origin_server_ts wins, not the last in order');
});

test('your own last message counts, and marks the chat as "mine"', () => {
  const a = computeRoomActivity([text(NOW - 50_000), text(NOW - 5_000, ME)], ME, NOW);
  assert.equal(a.ts, NOW - 5_000);
  assert.equal(a.mine, NOW - 5_000);
});

test('a mention of you counts as "mine" (m.mentions or a push highlight)', () => {
  const byMentions = computeRoomActivity(
    [text(NOW - 5_000, ANNA, { 'm.mentions': { user_ids: [ME] } })],
    ME,
    NOW
  );
  assert.equal(byMentions.mine, NOW - 5_000);
  const byHighlight = computeRoomActivity([text(NOW - 7_000)], ME, NOW, () => true);
  assert.equal(byHighlight.mine, NOW - 7_000);
  const notMe = computeRoomActivity([text(NOW - 7_000)], ME, NOW, () => false);
  assert.equal(notMe.mine, 0);
});

test('a timestamp from the future is capped at now', () => {
  const a = computeRoomActivity([text(NOW + 86_400_000)], ME, NOW);
  assert.equal(a.ts, NOW);
});

test('only noise loaded → unknown, with the oldest loaded event as upper bound', () => {
  const a = computeRoomActivity(
    [ev('m.room.name', { stateKey: '', ts: NOW - 9_000 }), ev('m.bridge', { ts: NOW - 1_000 })],
    ME,
    NOW
  );
  assert.equal(a.known, false);
  assert.equal(a.upper, NOW - 9_000);
});

test('a brand-new chat with no messages sits at its start time', () => {
  const a = computeRoomActivity(
    [
      ev('m.room.create', { stateKey: '', ts: NOW - 2_000, sender: '@whatsappbot:hs' }),
      ev('m.room.member', {
        sender: ME,
        stateKey: ME,
        ts: NOW - 1_000,
        content: { membership: 'join' },
      }),
    ],
    ME,
    NOW
  );
  assert.equal(a.known, true);
  assert.equal(a.startOnly, true);
  assert.equal(a.ts, NOW - 1_000);
});

test('a chat you just joined that already has messages sits where its last message is', () => {
  const a = computeRoomActivity(
    [
      text(NOW - 86_400_000),
      ev('m.room.member', {
        sender: ME,
        stateKey: ME,
        ts: NOW - 1_000,
        content: { membership: 'join' },
      }),
    ],
    ME,
    NOW
  );
  assert.equal(a.ts, NOW - 86_400_000);
});

// ---------------------------------------------------------------------------
// 3. Merging observations over time
// ---------------------------------------------------------------------------
test('merge never moves a chat back in time (late-arriving old history)', () => {
  const now = { ts: NOW - 1_000, mine: 0, known: true };
  const old = { ts: NOW - 99_000_000, mine: 0, known: true };
  assert.equal(mergeRoomActivity(now, old), now);
});

test('merge: the first real message replaces a "chat started" placeholder', () => {
  const started = { ts: NOW - 1_000, mine: NOW - 1_000, known: true, startOnly: true };
  const backfilled = { ts: NOW - 86_400_000, mine: 0, known: true };
  const merged = mergeRoomActivity(started, backfilled);
  assert.equal(merged.ts, NOW - 86_400_000);
  assert.equal(merged.startOnly, undefined);
  assert.equal(merged.mine, NOW - 1_000);
});

test('merge: a later join does not lift a chat that has messages', () => {
  const msg = { ts: NOW - 86_400_000, mine: 0, known: true };
  const joined = { ts: NOW - 1_000, mine: NOW - 1_000, known: true, startOnly: true };
  const merged = mergeRoomActivity(msg, joined);
  assert.equal(merged.ts, NOW - 86_400_000);
  assert.equal(merged.mine, NOW - 1_000);
});

test('merge: unknown + known → known, and known is never downgraded', () => {
  const unknown = { ts: 0, mine: 0, known: false, upper: NOW - 5 };
  const known = { ts: NOW - 10, mine: 0, known: true };
  assert.equal(mergeRoomActivity(unknown, known).known, true);
  assert.equal(mergeRoomActivity(known, unknown), known);
});

test('rawEventLike reads a /messages chunk event', () => {
  const a = computeRoomActivity(
    [
      rawEventLike({
        type: 'm.room.message',
        origin_server_ts: NOW - 4,
        sender: ANNA,
        content: { msgtype: 'm.text' },
      }),
    ],
    ME,
    NOW
  );
  assert.equal(a.ts, NOW - 4);
});

// ---------------------------------------------------------------------------
// 4. Ordering — the synthetic scenario from the brief
// ---------------------------------------------------------------------------
const facts = (roomId, extra = {}) => ({
  roomId,
  name: roomId,
  direct: false,
  muted: false,
  archived: false,
  favourite: false,
  network: 'whatsapp',
  ...extra,
});

const MIN = 60_000;
const SCENARIO_FACTS = new Map(
  [
    facts('mutedGroup', { muted: true, name: 'Unkomarkt Channel' }),
    facts('avatarDm', { direct: true, name: 'Anna' }),
    facts('backfill', { name: 'Bern Flats' }),
    facts('myLastDm', { direct: true, name: 'Molly' }),
    facts('olderGroup', { name: 'Connect Bern Board' }),
    facts('archived', { archived: true, name: 'Old Archive' }),
  ].map((f) => [f.roomId, f])
);
// What each chat's loaded timeline produces, oldest event first.
const SCENARIO_ACTIVITY = new Map([
  // A muted group that JUST got a message from someone else; you last wrote there 2 days ago.
  [
    'mutedGroup',
    computeRoomActivity([text(NOW - 2 * 1440 * MIN, ME), text(NOW - 1 * MIN)], ME, NOW),
  ],
  // A DM whose last message is 3 h old; its only new event is an avatar change 30 s ago.
  [
    'avatarDm',
    computeRoomActivity(
      [text(NOW - 180 * MIN), ev('m.room.avatar', { stateKey: '', ts: NOW - 0.5 * MIN })],
      ME,
      NOW
    ),
  ],
  // A room whose newest message is 20 min old, then a bridge backfill of year-old messages.
  [
    'backfill',
    computeRoomActivity(
      [text(NOW - 20 * MIN), text(NOW - 525_600 * MIN), text(NOW - 500_000 * MIN)],
      ME,
      NOW
    ),
  ],
  // A DM where YOU sent the last message, 5 min ago.
  ['myLastDm', computeRoomActivity([text(NOW - 60 * MIN), text(NOW - 5 * MIN, ME)], ME, NOW)],
  ['olderGroup', computeRoomActivity([text(NOW - 600 * MIN)], ME, NOW)],
  ['archived', computeRoomActivity([text(NOW - 2 * MIN)], ME, NOW)],
]);
const IDS = Array.from(SCENARIO_FACTS.keys());

test('scenario, default ("stay put"): muted/archived do not jump up, noise does not lift', () => {
  const order = sortChats(IDS, SCENARIO_FACTS, SCENARIO_ACTIVITY, 'activity', 'stay');
  assert.deepEqual(order, [
    'myLastDm', //   5 min — your own message
    'backfill', //   20 min — backfill did not change it
    'avatarDm', //   3 h — the avatar change 30 s ago did not lift it
    'olderGroup', // 10 h
    'mutedGroup', // placed at YOUR last message (2 days), not at the new one (1 min)
    'archived', //   archived = muted; you never wrote → bottom
  ]);
});

test('scenario, "at the bottom": muted + archived below everything, newest first', () => {
  const order = sortChats(IDS, SCENARIO_FACTS, SCENARIO_ACTIVITY, 'activity', 'bottom');
  assert.deepEqual(order, [
    'myLastDm',
    'backfill',
    'avatarDm',
    'olderGroup',
    'mutedGroup',
    'archived',
  ]);
  assert.ok(order.indexOf('archived') > order.indexOf('olderGroup'));
});

test('scenario, "like any other chat": the muted message moves it to the top', () => {
  const order = sortChats(IDS, SCENARIO_FACTS, SCENARIO_ACTIVITY, 'activity', 'normal');
  assert.deepEqual(order, [
    'mutedGroup',
    'archived',
    'myLastDm',
    'backfill',
    'avatarDm',
    'olderGroup',
  ]);
});

test('stay put: a mention in a muted chat moves it up', () => {
  const act = new Map(SCENARIO_ACTIVITY);
  act.set(
    'mutedGroup',
    computeRoomActivity([text(NOW - 1 * MIN, ANNA, { 'm.mentions': { user_ids: [ME] } })], ME, NOW)
  );
  const order = sortChats(IDS, SCENARIO_FACTS, act, 'activity', 'stay');
  assert.equal(order[0], 'mutedGroup');
});

test('stay put: a muted chat is never placed above its own last message', () => {
  const act = new Map([
    ['m', { ts: NOW - 1440 * MIN, mine: NOW - 1 * MIN, known: true }], // joined just now, old messages
    ['x', { ts: NOW - 60 * MIN, mine: 0, known: true }],
  ]);
  const f = new Map([
    ['m', facts('m', { muted: true })],
    ['x', facts('x')],
  ]);
  assert.deepEqual(sortChats(['m', 'x'], f, act, 'activity', 'stay'), ['x', 'm']);
});

test('chats with an unknown last message wait below known ones, likeliest-recent first', () => {
  const act = new Map([
    ['k', { ts: NOW - 100 * 1440 * MIN, mine: 0, known: true }],
    ['u1', { ts: 0, mine: 0, known: false, upper: NOW - 10 * MIN }],
    ['u2', { ts: 0, mine: 0, known: false, upper: NOW - 1 * MIN }],
  ]);
  const f = new Map(['k', 'u1', 'u2'].map((id) => [id, facts(id)]));
  assert.deepEqual(sortChats(['u1', 'k', 'u2'], f, act, 'activity', 'stay'), ['k', 'u2', 'u1']);
});

test('name sort ignores case, accents and "#"', () => {
  const f = new Map([
    ['1', facts('1', { name: 'émile' })],
    ['2', facts('2', { name: '#Anna' })],
    ['3', facts('3', { name: 'bob' })],
  ]);
  assert.deepEqual(sortChats(['1', '2', '3'], f, new Map(), 'name', 'stay'), ['2', '3', '1']);
});

test('unread first is a stable partition of the sorted list', () => {
  assert.deepEqual(
    unreadFirst(['a', 'b', 'c', 'd'], (id) => id === 'c' || id === 'b'),
    ['b', 'c', 'a', 'd']
  );
});

test('sorting 9,000 chats stays cheap (< 60 ms)', () => {
  const ids = [];
  const f = new Map();
  const act = new Map();
  for (let i = 0; i < 9000; i += 1) {
    const id = `!r${i}:hs`;
    ids.push(id);
    f.set(id, facts(id, { muted: i % 40 === 0, direct: i % 2 === 0 }));
    act.set(
      id,
      i % 10 === 0
        ? { ts: 0, mine: 0, known: false, upper: i }
        : { ts: NOW - i * 997, mine: 0, known: true }
    );
  }
  sortChats(ids, f, act, 'activity', 'stay'); // warm up
  const t0 = performance.now();
  const out = sortChats(ids, f, act, 'activity', 'stay');
  const ms = performance.now() - t0;
  assert.equal(out.length, 9000);
  assert.ok(ms < 60, `took ${ms.toFixed(1)} ms`);
});

// ---------------------------------------------------------------------------
// 5. Filter chips + name filter
// ---------------------------------------------------------------------------
const FFACTS = new Map(
  [
    facts('dmWa', { direct: true, name: 'Anna Müller', network: 'whatsapp' }),
    facts('dmTg', { direct: true, name: 'Oksana', network: 'telegram', favourite: true }),
    facts('grpSig', { name: 'Signal Friends', network: 'signal' }),
    facts('grpMuted', { name: 'Unkomarkt', muted: true, network: 'whatsapp' }),
    facts('grpArch', { name: 'Archived Thing', archived: true, network: 'messenger' }),
    facts('native', { name: 'Matrix HQ', network: 'matrix' }),
  ].map((f) => [f.roomId, f])
);
const FIDS = Array.from(FFACTS.keys());
const ctx = (extra = {}) => ({
  facts: FFACTS,
  isUnread: (id) => id === 'dmWa' || id === 'grpSig',
  hasMention: (id) => id === 'grpSig',
  mutedMode: 'stay',
  query: '',
  ...extra,
});
const run = (filter, extra) => FIDS.filter(makeChatFilter(filter, ctx(extra)));

test('filter: All', () => assert.deepEqual(run('all'), FIDS));
test('filter: All with "hidden" muted mode leaves out muted + archived', () =>
  assert.deepEqual(run('all', { mutedMode: 'hide' }), ['dmWa', 'dmTg', 'grpSig', 'native']));
test('filter: hidden muted chats still turn up in name search', () =>
  assert.deepEqual(run('all', { mutedMode: 'hide', query: 'unko' }), ['grpMuted']));
test('filter: Unread', () => assert.deepEqual(run('unread'), ['dmWa', 'grpSig']));
test('filter: People', () => assert.deepEqual(run('people'), ['dmWa', 'dmTg']));
test('filter: Groups', () =>
  assert.deepEqual(run('groups'), ['grpSig', 'grpMuted', 'grpArch', 'native']));
test('filter: Mentions', () => assert.deepEqual(run('mentions'), ['grpSig']));
test('filter: Favourites', () => assert.deepEqual(run('favourites'), ['dmTg']));
test('filter: Muted & archived', () => assert.deepEqual(run('muted'), ['grpMuted', 'grpArch']));
test('filter: by network', () => {
  assert.deepEqual(run('net:whatsapp'), ['dmWa', 'grpMuted']);
  assert.deepEqual(run('net:telegram'), ['dmTg']);
  assert.deepEqual(run('net:messenger'), ['grpArch']);
  assert.deepEqual(run('net:matrix'), ['native']);
});
test('filter: name, case- and accent-insensitive, combined with a chip', () => {
  assert.deepEqual(run('all', { query: 'MULLER' }), ['dmWa']);
  assert.deepEqual(run('people', { query: 'o' }), ['dmTg']);
  assert.ok(nameMatches('Zoë', 'zoe'));
});
test('filter: the open chat never disappears under you', () =>
  assert.deepEqual(run('unread', { stickyRoomId: 'native' }), ['dmWa', 'grpSig', 'native']));
test('isChatFilter accepts chips + networks, rejects junk', () => {
  assert.ok(isChatFilter('unread'));
  assert.ok(isChatFilter('net:signal'));
  assert.ok(!isChatFilter('net:myspace'));
  assert.ok(!isChatFilter(42));
});

// ---------------------------------------------------------------------------
// 6. Network detection
// ---------------------------------------------------------------------------
test('network from m.bridge protocol ids (mautrix values seen on this server)', () => {
  assert.equal(detectChatNetwork(['whatsapp']), 'whatsapp');
  assert.equal(detectChatNetwork(['telegram']), 'telegram');
  assert.equal(detectChatNetwork(['signal']), 'signal');
  assert.equal(detectChatNetwork(['facebookgo']), 'messenger');
  assert.equal(detectChatNetwork(['facebook']), 'messenger');
  assert.equal(detectChatNetwork(['instagramgo']), 'instagram');
  assert.equal(detectChatNetwork(['linkedin']), 'linkedin');
  assert.equal(detectChatNetwork(['slack']), 'other');
});
test('network falls back to the creator / DM partner user id', () => {
  assert.equal(detectChatNetwork([], ['@whatsappbot:hs']), 'whatsapp');
  assert.equal(detectChatNetwork([], [null, '@telegram_123:hs']), 'telegram');
  assert.equal(detectChatNetwork([], ['@messengerbot:hs']), 'messenger');
  assert.equal(detectChatNetwork([], ['@me:hs', '@anna:matrix.org']), 'matrix');
});
