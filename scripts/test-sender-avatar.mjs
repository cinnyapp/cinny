#!/usr/bin/env node
/**
 * Unit tests for the picture next to a message (src/app/utils/senderAvatar.ts)
 * and the shared 1:1-chat rule it builds on (src/app/utils/dmAvatar.ts).
 *
 *   npm run test:sender-avatar
 *
 * Rooms are small fakes shaped like real mautrix-whatsapp portals on
 * chagai.website (me + bridge bot + the contact's ghost; sometimes the bridge's
 * puppet of my own number; since WhatsApp's LID change sometimes a second
 * ghost of the same contact).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSenderAvatarMxcs,
  getSenderAvatarMxc,
  isBridgedDmContact,
} from '../src/app/utils/senderAvatar.ts';
import { getDmAvatarMxc, getDmPartnerMember } from '../src/app/utils/dmAvatar.ts';

const ME = '@me:chagai.website';
const BOT = '@whatsappbot:chagai.website';
const OWN_PUPPET = '@whatsapp_41766524456:chagai.website';
const MOLLY = '@whatsapp_447896145370:chagai.website';
const MOLLY_LID = '@whatsapp_lid-85177892106451:chagai.website';

const member = (userId, avatar, name, membership = 'join') => ({
  userId,
  membership,
  name: name ?? userId,
  rawDisplayName: name ?? userId,
  getMxcAvatarUrl: () => avatar,
});
const ev = (content) => ({ getContent: () => content });

function fakeRoom({ members = [], roomAvatar, bridged = true, roomType = 'dm', channelId } = {}) {
  const state = {};
  if (bridged) {
    state['m.bridge'] = [
      ev({
        bridgebot: BOT,
        channel: {
          displayname: 'Molly (WA)',
          'fi.mau.receiver': '41766524456',
          ...(channelId ? { id: channelId } : {}),
        },
        'com.beeper.room_type': roomType,
      }),
    ];
    state['io.element.functional_members'] = ev({ service_members: [BOT] });
  }
  return {
    roomId: '!wYLfFLeQmaHMjPmvkc:chagai.website',
    myUserId: ME,
    getMembers: () => members,
    getMember: (id) => members.find((m) => m.userId === id) ?? null,
    getMxcAvatarUrl: () => roomAvatar ?? null,
    getAvatarFallbackMember: () => undefined,
    currentState: {
      getStateEvents: (type, stateKey) => {
        const v = state[type];
        if (stateKey === undefined) return Array.isArray(v) ? v : v ? [v] : [];
        return Array.isArray(v) ? v[0] : v ?? null;
      },
    },
  };
}

test('1. the person has a picture → their picture, chat picture as the retry', () => {
  const room = fakeRoom({
    members: [member(ME, 'mxc://x/me'), member(BOT), member(MOLLY, 'mxc://x/molly')],
    roomAvatar: 'mxc://x/chat',
  });
  assert.deepEqual(getSenderAvatarMxcs(room, MOLLY, true), {
    mxc: 'mxc://x/molly',
    fallbackMxc: 'mxc://x/chat',
  });
});

test('2. bridged 1:1, the person has NO picture → the chat picture stands in', () => {
  const room = fakeRoom({
    members: [member(ME), member(BOT), member(MOLLY, undefined)],
    roomAvatar: 'mxc://x/chat',
  });
  assert.deepEqual(getSenderAvatarMxcs(room, MOLLY, true), {
    mxc: 'mxc://x/chat',
    fallbackMxc: undefined,
  });
  // and the chat list / header use the same picture
  assert.equal(getDmAvatarMxc(room, true), 'mxc://x/chat');
});

test('2b. member event not loaded yet (lazy loading) → chat picture, not blank', () => {
  const room = fakeRoom({ members: [member(ME)], roomAvatar: 'mxc://x/chat' });
  assert.equal(getSenderAvatarMxc(room, MOLLY, true), 'mxc://x/chat');
});

test('2c. second ghost of the same contact (new WhatsApp LID id) → chat picture', () => {
  const room = fakeRoom({
    members: [
      member(ME),
      member(BOT),
      member(MOLLY, 'mxc://x/molly'),
      member(MOLLY_LID, undefined),
    ],
    roomAvatar: 'mxc://x/chat',
  });
  assert.equal(getSenderAvatarMxc(room, MOLLY_LID, true), 'mxc://x/chat');
  // the 1:1 rule no longer gives up with two ghosts: picks the one with a picture
  assert.equal(getDmPartnerMember(room)?.userId, MOLLY);
});

test('2d. two ghosts: the one the chat belongs to wins (channel id match)', () => {
  const room = fakeRoom({
    members: [member(ME), member(BOT), member(MOLLY, 'mxc://x/a'), member(MOLLY_LID, 'mxc://x/b')],
    channelId: '85177892106451@lid',
  });
  assert.equal(getDmPartnerMember(room)?.userId, MOLLY_LID);
});

test('3. nobody has a picture → nothing (coloured initial placeholder)', () => {
  const room = fakeRoom({ members: [member(ME), member(BOT), member(MOLLY)] });
  assert.deepEqual(getSenderAvatarMxcs(room, MOLLY, true), {
    mxc: undefined,
    fallbackMxc: undefined,
  });
});

test('setting off: chat picture first, own picture as the retry', () => {
  const room = fakeRoom({
    members: [member(ME), member(BOT), member(MOLLY, 'mxc://x/molly')],
    roomAvatar: 'mxc://x/chat',
  });
  assert.deepEqual(getSenderAvatarMxcs(room, MOLLY, false), {
    mxc: 'mxc://x/chat',
    fallbackMxc: 'mxc://x/molly',
  });
});

test('same picture twice → no pointless retry', () => {
  const room = fakeRoom({
    members: [member(ME), member(BOT), member(MOLLY, 'mxc://x/same')],
    roomAvatar: 'mxc://x/same',
  });
  assert.deepEqual(getSenderAvatarMxcs(room, MOLLY, true), {
    mxc: 'mxc://x/same',
    fallbackMxc: undefined,
  });
});

test('never borrows the chat picture for me, the bridge bot or my own puppet', () => {
  const room = fakeRoom({
    members: [member(ME), member(BOT), member(OWN_PUPPET), member(MOLLY)],
    roomAvatar: 'mxc://x/chat',
  });
  for (const id of [ME, BOT, OWN_PUPPET]) {
    assert.equal(isBridgedDmContact(room, id), false, id);
    assert.equal(getSenderAvatarMxc(room, id, true), undefined, id);
  }
  assert.equal(isBridgedDmContact(room, MOLLY), true);
});

test('groups and normal rooms: only the person’s own picture, never the group picture', () => {
  const group = fakeRoom({
    roomType: 'group',
    members: [member(ME), member(BOT), member(MOLLY), member('@whatsapp_2:hs', 'mxc://x/2')],
    roomAvatar: 'mxc://x/group',
  });
  assert.equal(getSenderAvatarMxc(group, MOLLY, true), undefined);
  assert.equal(getSenderAvatarMxc(group, '@whatsapp_2:hs', true), 'mxc://x/2');
  const plain = fakeRoom({
    bridged: false,
    members: [member(ME), member('@bob:hs')],
    roomAvatar: 'mxc://x/r',
  });
  assert.equal(getSenderAvatarMxc(plain, '@bob:hs', true), undefined);
});

test('broken state never throws', () => {
  const room = fakeRoom({ members: [member(MOLLY, 'mxc://m')] });
  room.currentState.getStateEvents = () => {
    throw new Error('boom');
  };
  room.getMember = () => {
    throw new Error('boom');
  };
  assert.deepEqual(getSenderAvatarMxcs(room, MOLLY, true), { mxc: undefined });
});
