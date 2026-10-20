#!/usr/bin/env node
/**
 * Startup snapshot: what is stored to draw the chat list instantly on start.
 *   npm run test:startup-snapshot
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildSnapshot,
  snapshotForHome,
  parseSnapshot,
  sameSnapshot,
  snapshotKey,
  nameInitial,
  SNAPSHOT_MAX_ROOMS,
  SNAPSHOT_MAX_BYTES,
} = await import('../src/app/features/startup-snapshot/snapshot.ts');

const ME = '@me:chagai.website';
const rooms = (n, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({ id: `!r${i}:hs`, name: `Chat ${i}`, ...extra }));

test('keeps order, caps the count, sanitises fields', () => {
  const snap = buildSnapshot(
    ME,
    [
      {
        id: '!a:hs',
        name: 'Anna',
        dm: true,
        unread: 3,
        highlight: 1,
        avatar: 'https://mx/thumb/a',
      },
      { id: '!b:hs', name: 'Group', avatar: 'javascript:alert(1)', unread: -2, muted: true },
      ...rooms(400),
    ],
    9000,
    123
  );
  assert.equal(snap.v, 1);
  assert.equal(snap.userId, ME);
  assert.equal(snap.total, 9000);
  assert.equal(snap.at, 123);
  assert.equal(snap.rooms.length, SNAPSHOT_MAX_ROOMS);
  assert.deepEqual(snap.rooms[0], {
    id: '!a:hs',
    name: 'Anna',
    avatar: 'https://mx/thumb/a',
    dm: true,
    unread: 3,
    highlight: 1,
  });
  assert.deepEqual(
    snap.rooms[1],
    { id: '!b:hs', name: 'Group', muted: true },
    'no js: url, no negative count'
  );
  assert.equal(snap.rooms[2].id, '!r0:hs');
});

test('stays inside the size budget even with huge names', () => {
  const big = rooms(150, { name: 'x'.repeat(5000), avatar: `https://mx/${'y'.repeat(500)}` });
  const snap = buildSnapshot(ME, big, 150);
  assert.ok(JSON.stringify(snap).length <= SNAPSHOT_MAX_BYTES);
  assert.ok(snap.rooms.length > 10);
  assert.equal(snap.rooms[0].name.length, 80);
});

test('parse round-trips and rejects other users / garbage', () => {
  const snap = buildSnapshot(ME, rooms(5), 5);
  const raw = JSON.stringify(snap);
  assert.deepEqual(parseSnapshot(raw, ME), snap);
  assert.equal(parseSnapshot(raw, '@other:hs'), undefined, "never show someone else's chats");
  assert.equal(parseSnapshot('{nope', ME), undefined);
  assert.equal(parseSnapshot(null, ME), undefined);
  assert.equal(parseSnapshot(JSON.stringify({ ...snap, v: 2 }), ME), undefined);
  assert.equal(parseSnapshot(JSON.stringify({ ...snap, rooms: [] }), ME), undefined);
  assert.equal(parseSnapshot(JSON.stringify({ ...snap, rooms: [{ id: 5 }] }), ME), undefined);
});

test('unchanged content is detected (no needless rewrites)', () => {
  const a = buildSnapshot(ME, rooms(5), 5, 1);
  const b = buildSnapshot(ME, rooms(5), 5, 2);
  assert.equal(sameSnapshot(a, b), true);
  assert.equal(sameSnapshot(a, buildSnapshot(ME, rooms(6), 6, 3)), false);
  assert.equal(sameSnapshot(undefined, b), false);
});

test('per-user key and initials', () => {
  assert.equal(snapshotKey(ME), 'cinny_startup_snapshot_v1:@me:chagai.website');
  assert.equal(nameInitial('  #general'), 'G');
  assert.equal(nameInitial('ümit'), 'Ü');
  assert.equal(nameInitial('🙂'), '#');
});

test('a space-child room never flashes on Home: the snapshot follows the real Home rule', () => {
  // saved list: an ordinary group, a chat that belongs to a space (e.g. sleepy.bike), a 1:1
  const snap = buildSnapshot(
    ME,
    [
      { id: '!group:hs', name: 'Basel Meetup' },
      { id: '!sleepy:hs', name: 'sleepy.bike contributors', parent: true },
      { id: '!anna:hs', name: 'Anna (WA)', dm: true },
      { id: '!annaSpace:hs', name: 'Anna in a space', dm: true, parent: true },
    ],
    4,
    1,
    false
  );
  assert.equal(snap.all, false);
  assert.equal(snap.rooms[1].parent, true, 'the space-child fact is saved with the chat');

  // "Rooms" Home (show-all off): no space children, 1:1s stay in Direct — what the real list shows
  assert.deepEqual(
    snapshotForHome(snap, false).rooms.map((r) => r.id),
    ['!group:hs']
  );
  // "show all chats in Home" on: everything, as the real list does
  assert.deepEqual(
    snapshotForHome(snap, true).rooms.map((r) => r.id),
    ['!group:hs', '!sleepy:hs', '!anna:hs', '!annaSpace:hs']
  );
  // nothing left to show -> no snapshot (plain splash), never an empty list
  const onlySpace = buildSnapshot(ME, [{ id: '!s:hs', name: 'S', parent: true }], 1, 1, false);
  assert.equal(snapshotForHome(onlySpace, false), undefined);
  assert.equal(snapshotForHome(undefined, false), undefined);
  // survives the parse round trip (what is read at start-up)
  const back = parseSnapshot(JSON.stringify(snap), ME);
  assert.deepEqual(
    snapshotForHome(back, false).rooms.map((r) => r.id),
    ['!group:hs']
  );
});

test('the setting is part of "same snapshot" so a changed setting is re-saved', () => {
  const a = buildSnapshot(ME, rooms(3), 3, 1, true);
  const b = buildSnapshot(ME, rooms(3), 3, 2, false);
  assert.equal(sameSnapshot(a, b), false);
});
