#!/usr/bin/env node
/**
 * Unit tests for the 1:1-chat picture logic (src/app/utils/dmAvatar.ts).
 *
 *   npm run test:dm-avatar
 *
 * Rooms are small fakes shaped like real mautrix-whatsapp portals on
 * chagai.website (me + bridge bot + the contact's ghost, sometimes also the
 * bridge's puppet of my own number).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDmPartnerMember,
  getDmPartnerUserId,
  getBridgedDmRoomIds,
  getDmAvatarMxc,
  getDmColorKey,
  isBridgedDm,
} from '../src/app/utils/dmAvatar.ts';

const ME = '@me:chagai.website';
const BOT = '@whatsappbot:chagai.website';
const OWN_PUPPET = '@whatsapp_41766524456:chagai.website';
const MOLLY = '@whatsapp_447896145370:chagai.website';

const member = (userId, avatar, name, membership = 'join') => ({
  userId,
  membership,
  name: name ?? userId,
  rawDisplayName: name ?? userId,
  getMxcAvatarUrl: () => avatar,
});

const ev = (content) => ({ getContent: () => content });

function fakeRoom({
  members = [],
  roomAvatar,
  bridged = true,
  functional = [BOT],
  channelName = 'Molly (WA)',
  fallback,
} = {}) {
  const state = {};
  if (bridged) {
    state['m.bridge'] = [
      ev({
        bridgebot: BOT,
        channel: { displayname: channelName, 'fi.mau.receiver': '41766524456' },
        'com.beeper.room_type': 'dm',
      }),
    ];
  }
  if (functional) state['io.element.functional_members'] = ev({ service_members: functional });
  return {
    roomId: '!wYLfFLeQmaHMjPmvkc:chagai.website',
    myUserId: ME,
    getMembers: () => members,
    getMxcAvatarUrl: () => roomAvatar ?? null,
    getAvatarFallbackMember: () => fallback,
    currentState: {
      getStateEvents: (type, stateKey) => {
        const v = state[type];
        if (stateKey === undefined) return Array.isArray(v) ? v : v ? [v] : [];
        return Array.isArray(v) ? v[0] : v ?? null;
      },
    },
  };
}

test('bridged DM: picks the contact, not me / the bot', () => {
  const room = fakeRoom({
    members: [
      member(ME),
      member(BOT, 'mxc://maunium.net/bot'),
      member(MOLLY, 'mxc://x/molly-new', 'Molly (WA)'),
    ],
    roomAvatar: 'mxc://x/molly-old',
  });
  assert.equal(isBridgedDm(room), true);
  assert.equal(getDmPartnerMember(room)?.userId, MOLLY);
});

test("prefers the contact's live photo over a stale room photo (default)", () => {
  const room = fakeRoom({
    members: [member(ME), member(BOT), member(MOLLY, 'mxc://x/molly-new', 'Molly (WA)')],
    roomAvatar: 'mxc://x/molly-old',
  });
  assert.equal(getDmAvatarMxc(room), 'mxc://x/molly-new');
  assert.equal(getDmAvatarMxc(room, true), 'mxc://x/molly-new');
});

test('setting off: room photo first, contact photo as fallback', () => {
  const room = fakeRoom({
    members: [member(ME), member(BOT), member(MOLLY, 'mxc://x/molly-new')],
    roomAvatar: 'mxc://x/molly-old',
  });
  assert.equal(getDmAvatarMxc(room, false), 'mxc://x/molly-old');
  const noRoomPic = fakeRoom({ members: [member(ME), member(BOT), member(MOLLY, 'mxc://x/m')] });
  assert.equal(getDmAvatarMxc(noRoomPic, false), 'mxc://x/m');
});

test("ignores the bridge's puppet of my own number (4-member portals)", () => {
  const room = fakeRoom({
    members: [
      member(ME),
      member(BOT),
      member(OWN_PUPPET, 'mxc://x/me', 'Chagai (WA)'),
      member(MOLLY, 'mxc://x/molly', 'Molly (WA)'),
    ],
  });
  assert.equal(getDmPartnerMember(room)?.userId, MOLLY);
  assert.equal(getDmAvatarMxc(room), 'mxc://x/molly');
});

test('own puppet but no receiver hint: falls back to the bridge channel name', () => {
  const room = fakeRoom({
    members: [
      member(ME),
      member(BOT),
      member('@x_1:hs', 'mxc://x/a', 'Me (WA)'),
      member('@x_2:hs', 'mxc://x/b', 'Molly (WA)'),
    ],
  });
  room.currentState.getStateEvents = ((orig) => (type, key) => {
    const v = orig(type, key);
    if (type === 'm.bridge' && Array.isArray(v)) {
      return [
        ev({
          bridgebot: BOT,
          channel: { displayname: 'Molly (WA)' },
          'com.beeper.room_type': 'dm',
        }),
      ];
    }
    return v;
  })(room.currentState.getStateEvents);
  assert.equal(getDmPartnerMember(room)?.userId, '@x_2:hs');
});

test('contact not lazy-loaded yet: uses SDK heroes, then the room photo', () => {
  const viaHero = fakeRoom({ members: [member(ME)], fallback: member(MOLLY, 'mxc://x/hero') });
  assert.equal(getDmAvatarMxc(viaHero), 'mxc://x/hero');
  const nothing = fakeRoom({ members: [member(ME)], roomAvatar: 'mxc://x/room' });
  assert.equal(getDmAvatarMxc(nothing), 'mxc://x/room');
  const heroIsBot = fakeRoom({
    members: [member(ME)],
    roomAvatar: 'mxc://x/room',
    fallback: member(BOT, 'mxc://bot'),
  });
  assert.equal(getDmAvatarMxc(heroIsBot), 'mxc://x/room');
});

test('contact has no own photo: the chat photo stands in for them (2026-10-20 rule)', () => {
  const room = fakeRoom({
    members: [member(ME), member(BOT), member(MOLLY, undefined)],
    roomAvatar: 'mxc://x/chat',
  });
  assert.equal(getDmAvatarMxc(room), 'mxc://x/chat');
  const none = fakeRoom({ members: [member(ME), member(BOT), member(MOLLY, undefined)] });
  assert.equal(getDmAvatarMxc(none), undefined);
  // …but a plain (non-bridged) DM keeps its room picture as a fallback
  const plain = fakeRoom({
    bridged: false,
    functional: null,
    members: [member(ME), member('@bob:hs', '')],
    roomAvatar: 'mxc://x/r',
  });
  assert.equal(getDmAvatarMxc(plain), 'mxc://x/r');
});

test('a group (two other people) is never treated as a 1:1 chat', () => {
  const room = fakeRoom({
    bridged: false,
    functional: null,
    members: [member(ME), member('@a:hs', 'mxc://a'), member('@b:hs', 'mxc://b')],
    roomAvatar: 'mxc://group',
  });
  assert.equal(getDmPartnerMember(room), undefined);
  assert.equal(getDmAvatarMxc(room), 'mxc://group');
});

test('left / banned members do not count', () => {
  const room = fakeRoom({
    members: [
      member(ME),
      member(BOT),
      member('@old:hs', 'mxc://old', 'x', 'leave'),
      member(MOLLY, 'mxc://m'),
    ],
  });
  assert.equal(getDmPartnerMember(room)?.userId, MOLLY);
});

test('placeholder colour key = the contact, so list/header/timeline match', () => {
  const room = fakeRoom({ members: [member(ME), member(BOT), member(MOLLY)] });
  assert.equal(getDmColorKey(room), MOLLY);
  const unknown = fakeRoom({ members: [member(ME)] });
  assert.equal(getDmColorKey(unknown), unknown.roomId);
});

test('broken / throwing state never throws out of the helpers', () => {
  const room = fakeRoom({ members: [member(ME), member(MOLLY, 'mxc://m')] });
  room.currentState.getStateEvents = () => {
    throw new Error('boom');
  };
  assert.equal(getDmAvatarMxc(room), 'mxc://m');
});

test('header picture history: the contact, never the bridge bot that joined first (Telegram DM, 2026-11-03)', () => {
  const TG_BOT = '@telegrambot:chagai.website';
  const RACHEL = '@telegram_283970903:chagai.website';
  const room = fakeRoom({
    members: [member(TG_BOT), member(ME), member(RACHEL)],
    functional: [TG_BOT],
  });
  // Cinny's "oldest joined member" guess would be the bot
  assert.equal(getDmPartnerUserId(room, TG_BOT), RACHEL);
  // partner not loaded yet: a guess that is the bot / me is refused, a real one kept
  const lazy = fakeRoom({ members: [member(ME), member(TG_BOT)], functional: [TG_BOT] });
  lazy.getAvatarFallbackMember = () => null;
  assert.equal(getDmPartnerUserId(lazy, TG_BOT), undefined);
  assert.equal(getDmPartnerUserId(lazy, ME), undefined);
  assert.equal(getDmPartnerUserId(lazy, RACHEL), RACHEL);
});

// Real shape of a Telegram portal on chagai.website (2026-11-03): an old
// mautrix-telegram bridge event WITHOUT a room type next to the new one, me,
// the bot, the contact and the bridge's puppet of my own Telegram account.
const TG_BOT = '@telegrambot:chagai.website';
const TG_ME = '@telegram_1094837295:chagai.website';
const TG_RACHEL = '@telegram_658736473:chagai.website';
function telegramRoom({
  roomType = 'dm',
  membership = 'join',
  roomId = '!tg:chagai.website',
} = {}) {
  const room = fakeRoom({
    members: [
      member(TG_BOT),
      member(ME),
      member(TG_ME, 'mxc://me'),
      member(TG_RACHEL, 'mxc://r', 'Rachel'),
    ],
    functional: [TG_BOT],
    bridged: false,
  });
  const legacy = ev({ bridgebot: TG_BOT, channel: { id: '658736473', displayname: null } });
  const current = ev({
    bridgebot: TG_BOT,
    channel: {
      id: 'user:658736473',
      displayname: 'Rachel (Telegram)',
      'fi.mau.receiver': '1094837295',
    },
    ...(roomType ? { 'com.beeper.room_type': roomType } : {}),
  });
  const states = { 'm.bridge': [legacy, current], 'uk.half-shot.bridge': [legacy, current] };
  const base = room.currentState.getStateEvents;
  room.currentState.getStateEvents = (type, stateKey) =>
    states[type] ? (stateKey === undefined ? states[type] : states[type][0]) : base(type, stateKey);
  room.roomId = roomId;
  room.getMyMembership = () => membership;
  return room;
}

test('Telegram 1:1 portal (two bridge events, own puppet): Rachel is the partner, header never picks the bot', () => {
  const room = telegramRoom();
  assert.equal(isBridgedDm(room), true);
  assert.equal(getDmPartnerMember(room)?.userId, TG_RACHEL);
  assert.equal(getDmPartnerUserId(room, TG_BOT), TG_RACHEL);
});

test('bridge-marked 1:1 chats count as direct chats; groups, channels and left chats do not', () => {
  const rooms = [
    telegramRoom({ roomId: '!dm:x' }),
    telegramRoom({ roomId: '!group:x', roomType: 'group' }),
    telegramRoom({ roomId: '!channel:x', roomType: null }),
    telegramRoom({ roomId: '!left:x', membership: 'leave' }),
    telegramRoom({ roomId: '!invite:x', membership: 'invite' }),
    Object.assign(fakeRoom({ bridged: false, members: [member(ME), member(MOLLY)] }), {
      roomId: '!plain:x',
      getMyMembership: () => 'join',
    }),
  ];
  assert.deepEqual([...getBridgedDmRoomIds(rooms)].sort(), ['!dm:x', '!invite:x']);
});

test('scanning 9,000 chats for bridge 1:1 chats is cheap', () => {
  const rooms = Array.from({ length: 9000 }, (_, i) =>
    telegramRoom({ roomId: `!r${i}:x`, roomType: i % 3 ? 'dm' : 'group' })
  );
  const t0 = performance.now();
  const ids = getBridgedDmRoomIds(rooms);
  const ms = performance.now() - t0;
  assert.equal(ids.size, 6000);
  assert.ok(ms < 200, `${ms.toFixed(1)} ms`);
  console.log(`# scan 9000 rooms: ${ms.toFixed(1)} ms`);
});
