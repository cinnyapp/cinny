/**
 * Unit tests for lite mode's pure logic (src/client/lite-mode.ts).
 *
 * No test runner is installed in this repo, so this runs on node's own type
 * stripping and assert module:
 *
 *   node --experimental-strip-types scripts/test-lite-mode.mjs
 *
 * (node >= 22.6)
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLiteFilterDefinition,
  classifyRooms,
  countRoomEvents,
  lastMessageTs,
  LITE_AUTO_MIN_ROOMS,
  LITE_AUTO_WINDOW_DAYS,
  liteChoiceFromSettings,
  normalizeLiteOptions,
  pruneInitialSyncRooms,
  resolveAutoLite,
  pruneRoomsData,
  roomKeepReason,
  unionRoomIds,
} from '../src/client/lite-mode.ts';

const NOW = Date.UTC(2026, 9, 17); // 2026-10-17
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => NOW - n * DAY;

const member = (userId, extra = {}) => ({
  type: 'm.room.member',
  state_key: userId,
  sender: userId,
  content: { membership: 'join' },
  origin_server_ts: daysAgo(900),
  ...extra,
});

const room = ({
  messageDaysAgo,
  anyEventDaysAgo,
  members = ['@me:hs', '@them:hs'],
  memberCount = 2,
  stateFiller = 0,
  unread = 0,
  tags,
  spaceRoom = false,
  encrypted = false,
} = {}) => {
  const state = [
    {
      type: 'm.room.create',
      state_key: '',
      content: spaceRoom ? { type: 'm.space' } : {},
      origin_server_ts: daysAgo(900),
    },
    ...members.map((id) => member(id)),
  ];
  for (let i = 0; i < stateFiller; i += 1) {
    state.push({
      type: 'm.bridge',
      state_key: `k${i}`,
      content: { via: ['hs'] },
      origin_server_ts: daysAgo(900),
    });
  }
  const timeline = [];
  if (messageDaysAgo !== undefined) {
    timeline.push({
      type: encrypted ? 'm.room.encrypted' : 'm.room.message',
      sender: '@them:hs',
      content: { body: 'hi' },
      origin_server_ts: daysAgo(messageDaysAgo),
    });
  }
  if (anyEventDaysAgo !== undefined) {
    // a state event replayed into the timeline, e.g. a bridge re-syncing
    timeline.push({
      type: 'm.room.member',
      state_key: '@them:hs',
      sender: '@them:hs',
      content: { membership: 'join', displayname: 'Them' },
      origin_server_ts: daysAgo(anyEventDaysAgo),
    });
  }
  return {
    state: { events: state },
    timeline: { events: timeline, prev_batch: 'p' },
    account_data: { events: tags ? [{ type: 'm.tag', content: { tags } }] : [] },
    ephemeral: { events: [] },
    unread_notifications: { notification_count: unread, highlight_count: 0 },
    summary: { 'm.joined_member_count': memberCount },
  };
};

test('lastMessageTs only counts real messages, not state replays', () => {
  const r = room({ messageDaysAgo: 400, anyEventDaysAgo: 1 });
  assert.equal(lastMessageTs(r), daysAgo(400));
});

test('encrypted messages count as messages', () => {
  const r = room({ messageDaysAgo: 3, encrypted: true });
  assert.equal(lastMessageTs(r), daysAgo(3));
});

test('a chat with a recent message is kept', () => {
  const { dormant, kept } = classifyRooms(
    { join: { '!a:hs': room({ messageDaysAgo: 5 }) } },
    { windowDays: 90, now: NOW }
  );
  assert.deepEqual(dormant, []);
  assert.deepEqual(kept, ['!a:hs']);
});

test('a chat whose last message is older than the window is skipped', () => {
  const { dormant, keptBecause } = classifyRooms(
    { join: { '!a:hs': room({ messageDaysAgo: 200 }) } },
    { windowDays: 90, now: NOW }
  );
  assert.deepEqual(dormant, ['!a:hs']);
  assert.deepEqual(keptBecause, {});
});

test('the window is honoured: 180 days keeps what 90 days skips', () => {
  const rooms = { join: { '!a:hs': room({ messageDaysAgo: 120 }) } };
  assert.deepEqual(classifyRooms(rooms, { windowDays: 90, now: NOW }).dormant, ['!a:hs']);
  assert.deepEqual(classifyRooms(rooms, { windowDays: 180, now: NOW }).dormant, []);
});

test('a bridge state re-sync does NOT keep a chat alive (the Signal lesson)', () => {
  // no message for 2 years, but the bridge rewrote its members yesterday
  const { dormant } = classifyRooms(
    { join: { '!a:hs': room({ messageDaysAgo: 730, anyEventDaysAgo: 1 }) } },
    { windowDays: 90, now: NOW }
  );
  assert.deepEqual(dormant, ['!a:hs']);
});

test('a portal that never had a message is skipped once it is old', () => {
  const { dormant } = classifyRooms(
    { join: { '!a:hs': room({ anyEventDaysAgo: 500 }) } },
    { windowDays: 90, now: NOW }
  );
  assert.deepEqual(dormant, ['!a:hs']);
});

test('a brand new empty portal is kept (nothing has aged yet)', () => {
  const { dormant, keptBecause } = classifyRooms(
    { join: { '!a:hs': room({ anyEventDaysAgo: 2 }) } },
    { windowDays: 90, now: NOW }
  );
  assert.deepEqual(dormant, []);
  assert.equal(keptBecause.active, 1);
});

test('unread, favourite, space, notes-to-self and bridge-bot chats are always kept', () => {
  const rooms = {
    join: {
      '!unread:hs': room({ messageDaysAgo: 900, unread: 3 }),
      '!fav:hs': room({ messageDaysAgo: 900, tags: { 'm.favourite': { order: 0.5 } } }),
      '!space:hs': room({ messageDaysAgo: 900, spaceRoom: true }),
      '!self:hs': room({ messageDaysAgo: 900, members: ['@me:hs'], memberCount: 1 }),
      '!bot:hs': room({ messageDaysAgo: 900, members: ['@me:hs', '@whatsappbot:hs'] }),
    },
  };
  const { dormant, kept, keptBecause } = classifyRooms(rooms, { windowDays: 90, now: NOW });
  assert.deepEqual(dormant, []);
  assert.equal(kept.length, 5);
  assert.deepEqual(keptBecause, {
    unread: 1,
    favourite: 1,
    space: 1,
    'low-member': 1,
    bot: 1,
  });
});

test('a bridged 1:1 chat is NOT a bot room just because the bridge bot is in it', () => {
  // you + the contact's puppet + the bridge bot — 6,013 of his chats looked like this
  const dm = room({
    messageDaysAgo: 900,
    members: ['@me:hs', '@whatsapp_4179:hs', '@whatsappbot:hs'],
    memberCount: 3,
  });
  assert.equal(roomKeepReason(dm), undefined);
  dm.summary['m.heroes'] = ['@whatsapp_4179:hs', '@whatsappbot:hs'];
  assert.equal(roomKeepReason(dm), undefined);
  // the real management room: you + the bot
  const admin = room({ messageDaysAgo: 900, members: ['@me:hs', '@whatsappbot:hs'] });
  assert.equal(roomKeepReason(admin), 'bot');
  admin.summary['m.heroes'] = ['@whatsappbot:hs'];
  assert.equal(roomKeepReason(admin), 'bot');
  // own member event not stored (lazy loading): still a management room
  assert.equal(roomKeepReason(room({ messageDaysAgo: 900, members: ['@telegrambot:hs'] })), 'bot');
  // a bot that left does not count
  const left = room({ messageDaysAgo: 900, members: ['@me:hs', '@them:hs'] });
  left.state.events.push({
    type: 'm.room.member',
    state_key: '@whatsappbot:hs',
    content: { membership: 'leave' },
  });
  assert.equal(roomKeepReason(left), undefined);
});

test('bot rooms: the initial /sync shape and the saved-record shape agree', () => {
  // A bridged 1:1 chat with a name (no heroes), lazy loading stored only you +
  // the bridge bot: the initial /sync has them once (state_after), the saved
  // record twice (state rolled back + state_after).
  const initialShape = {
    'org.matrix.msc4222.state_after': {
      events: [
        { type: 'm.room.create', state_key: '', content: {} },
        { type: 'm.room.name', state_key: '', content: { name: 'Anna' } },
        member('@me:hs'),
        member('@whatsappbot:hs'),
      ],
    },
    timeline: { events: [] },
    summary: { 'm.joined_member_count': 3, 'm.invited_member_count': 0 },
  };
  assert.equal(roomKeepReason(initialShape), undefined);
  const recordShape = {
    ...initialShape,
    state: { events: initialShape['org.matrix.msc4222.state_after'].events },
  };
  assert.equal(roomKeepReason(recordShape), undefined);
  // the real management room (you + the bot) is a bot room in BOTH shapes
  const adminInitial = {
    ...initialShape,
    summary: { 'm.joined_member_count': 2, 'm.invited_member_count': 0 },
  };
  assert.equal(roomKeepReason(adminInitial), 'bot');
  assert.equal(
    roomKeepReason({
      ...adminInitial,
      state: { events: adminInitial['org.matrix.msc4222.state_after'].events },
    }),
    'bot'
  );
  // a member who left later in the same list does not count
  const leftBot = {
    ...adminInitial,
    'org.matrix.msc4222.state_after': {
      events: [
        member('@me:hs'),
        member('@whatsappbot:hs'),
        member('@whatsappbot:hs', { content: { membership: 'leave' } }),
      ],
    },
  };
  assert.equal(roomKeepReason(leftBot), undefined);
});

test('roomKeepReason returns the specific reason', () => {
  assert.equal(roomKeepReason(room({ messageDaysAgo: 900, unread: 1 })), 'unread');
  assert.equal(roomKeepReason(room({ messageDaysAgo: 900, spaceRoom: true })), 'space');
  assert.equal(roomKeepReason(room({ messageDaysAgo: 900 })), undefined);
});

test('protected rooms are never skipped', () => {
  const { dormant, keptBecause } = classifyRooms(
    { join: { '!a:hs': room({ messageDaysAgo: 900 }) } },
    { windowDays: 90, now: NOW, protect: ['!a:hs'] }
  );
  assert.deepEqual(dormant, []);
  assert.equal(keptBecause.protected, 1);
});

test('event counts are reported so the saving can be measured', () => {
  const big = room({ messageDaysAgo: 900, stateFiller: 20 });
  const small = room({ messageDaysAgo: 1 });
  const { dormantEvents, keptEvents } = classifyRooms(
    { join: { '!old:hs': big, '!new:hs': small } },
    { windowDays: 90, now: NOW }
  );
  assert.equal(dormantEvents, countRoomEvents(big));
  assert.equal(keptEvents, countRoomEvents(small));
  assert.ok(dormantEvents > keptEvents);
});

test('pruneRoomsData removes only the listed joined rooms and keeps invites', () => {
  const rooms = {
    join: { '!a:hs': room({ messageDaysAgo: 900 }), '!b:hs': room({ messageDaysAgo: 1 }) },
    invite: { '!i:hs': { invite_state: { events: [] } } },
    knock: {},
    leave: {},
  };
  const pruned = pruneRoomsData(rooms, ['!a:hs']);
  assert.deepEqual(Object.keys(pruned.join), ['!b:hs']);
  assert.deepEqual(Object.keys(pruned.invite), ['!i:hs']);
  // the input is not mutated
  assert.deepEqual(Object.keys(rooms.join).sort(), ['!a:hs', '!b:hs']);
});

test('the sync filter excludes the skipped rooms and keeps lazy loading on', () => {
  const def = buildLiteFilterDefinition(['!a:hs', '!b:hs']);
  assert.deepEqual(def.room.not_rooms, ['!a:hs', '!b:hs']);
  assert.equal(def.room.state.lazy_load_members, true);
});

test('unionRoomIds accumulates across loads without duplicates', () => {
  assert.deepEqual(unionRoomIds(['!a:hs'], ['!a:hs', '!b:hs']), ['!a:hs', '!b:hs']);
});

test('settings are sanitised', () => {
  assert.deepEqual(normalizeLiteOptions(undefined), {
    enabled: false,
    windowDays: 90,
    serverFilter: false,
  });
  assert.deepEqual(normalizeLiteOptions({ enabled: true, windowDays: 7, serverFilter: 'yes' }), {
    enabled: true,
    windowDays: 90, // 7 is not an offered window
    serverFilter: false,
  });
  assert.equal(normalizeLiteOptions({ windowDays: 365 }).windowDays, 365);
});

test('a realistic 9,000-chat mix: 60% skipped', () => {
  const join = {};
  for (let i = 0; i < 9000; i += 1) {
    const dormantRoom = i % 10 < 6;
    join[`!r${i}:hs`] = room({
      messageDaysAgo: dormantRoom ? 300 + (i % 400) : i % 80,
      stateFiller: dormantRoom ? 12 : 4,
    });
  }
  const result = classifyRooms({ join }, { windowDays: 90, now: NOW });
  assert.equal(result.dormant.length, 5400);
  assert.equal(result.kept.length, 3600);
  assert.ok(
    result.dormantEvents / (result.dormantEvents + result.keptEvents) > 0.6,
    'skipping 60% of the chats must skip more than 60% of the stored events'
  );
});

test('automatic lite mode: on for big accounts, 30 days, off for small ones', () => {
  const auto = { enabled: false, choice: 'auto', windowDays: 90, serverFilter: false };
  assert.deepEqual(resolveAutoLite(auto, 9030), {
    enabled: true,
    windowDays: LITE_AUTO_WINDOW_DAYS,
    auto: true,
  });
  assert.equal(LITE_AUTO_WINDOW_DAYS, 30);
  assert.equal(resolveAutoLite(auto, LITE_AUTO_MIN_ROOMS - 1).enabled, false);
  assert.equal(resolveAutoLite(auto, LITE_AUTO_MIN_ROOMS).enabled, true);
  // the user's own choice always wins, with the user's own window
  assert.deepEqual(resolveAutoLite({ ...auto, choice: 'off' }, 9030), {
    enabled: false,
    windowDays: 90,
    auto: false,
  });
  assert.deepEqual(resolveAutoLite({ ...auto, choice: 'on', windowDays: 180 }, 50), {
    enabled: true,
    windowDays: 180,
    auto: false,
  });
  // options without a choice (older callers) keep the old meaning
  assert.equal(
    resolveAutoLite({ enabled: true, windowDays: 90, serverFilter: false }, 10).enabled,
    true
  );
  assert.equal(
    resolveAutoLite({ enabled: false, windowDays: 90, serverFilter: false }, 9000).enabled,
    false
  );
});

test('old saved settings map onto the new choice', () => {
  // liteMode:false was the old default and is in everyone's saved settings → auto
  assert.equal(liteChoiceFromSettings(undefined, false), 'auto');
  assert.equal(liteChoiceFromSettings(undefined, true), 'on');
  assert.equal(liteChoiceFromSettings('auto', true), 'on');
  assert.equal(liteChoiceFromSettings('auto', false), 'auto');
  assert.equal(liteChoiceFromSettings('off', true), 'off');
  assert.equal(liteChoiceFromSettings('on', false), 'on');
  assert.equal(liteChoiceFromSettings('bogus', false), 'auto');
  assert.equal(normalizeLiteOptions({ choice: 'on' }).enabled, true);
  assert.equal(normalizeLiteOptions({ choice: 'nope' }).choice, undefined);
});

test('pruneInitialSyncRooms: the cold initial sync is written lean, newest-first, auto decides', () => {
  const join = {};
  for (let i = 0; i < 2100; i += 1) {
    // 100 active chats, 2,000 quiet ones
    join[`!r${i}:hs`] = room({ messageDaysAgo: i < 100 ? i % 20 : 100 + (i % 300) });
  }
  const rooms = { join, invite: { '!i:hs': {} } };
  const auto = normalizeLiteOptions({ choice: 'auto', windowDays: 90 });
  const pruned = pruneInitialSyncRooms(rooms, auto, { now: NOW });
  assert.equal(pruned.enabled, true);
  assert.equal(pruned.auto, true);
  assert.equal(pruned.windowDays, LITE_AUTO_WINDOW_DAYS);
  assert.equal(pruned.totalRooms, 2100);
  assert.equal(pruned.classification.dormant.length, 2000);
  assert.equal(Object.keys(pruned.rooms.join).length, 100);
  assert.equal(pruned.rooms.invite, rooms.invite);
  const keys = Object.keys(pruned.rooms.join);
  assert.equal(keys[0], '!r0:hs');
  assert.equal(keys[1], '!r20:hs', 'newest-first, stable for ties');
  // input untouched
  assert.equal(Object.keys(join).length, 2100);
  // a small account is persisted as is
  const small = pruneInitialSyncRooms(
    { join: Object.fromEntries(Object.entries(join).slice(0, 500)) },
    auto,
    { now: NOW }
  );
  assert.equal(small.enabled, false);
  assert.equal(Object.keys(small.rooms.join).length, 500);
  // lite off → as is, whatever the size
  const off = pruneInitialSyncRooms(rooms, normalizeLiteOptions({ choice: 'off' }), { now: NOW });
  assert.equal(off.enabled, false);
  assert.equal(off.rooms, rooms);
});
