#!/usr/bin/env node
/**
 * Unit tests for the media viewer's timeline walk and the profile-picture
 * history extraction (synthetic events, no SDK, no network).
 *
 *   npm run test:media-gallery
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { WalkerCache } = await import('../src/app/features/media-viewer/walkerCache.ts');
const { GalleryWalker, classifyEvent, buildRoomEventFilter, extractLinks } = await import(
  '../src/app/features/media-viewer/galleryWalker.ts'
);
const {
  extractMemberAvatarHistory,
  extractRoomAvatarHistory,
  collectHistoryEvents,
  describeHistoryEntry,
  memberHistoryFilter,
} = await import('../src/app/features/profile-avatar-history/avatarHistory.ts');

const T0 = Date.UTC(2026, 0, 1);
const DAY = 86400000;

// ---------------------------------------------------------------- fake room
/** Builds a room timeline, oldest -> newest. */
function makeRoom({ n = 200, encrypted = false } = {}) {
  const events = [];
  for (let i = 0; i < n; i += 1) {
    let content;
    let type = 'm.room.message';
    if (i % 5 === 0)
      content = {
        msgtype: 'm.image',
        body: `img${i}.jpg`,
        url: `mxc://hs/img${i}`,
        info: { w: 800, h: 600, mimetype: 'image/jpeg' },
      };
    else if (i % 17 === 0)
      content = {
        msgtype: 'm.video',
        body: `v${i}.mp4`,
        url: `mxc://hs/v${i}`,
        info: { mimetype: 'video/mp4', thumbnail_url: `mxc://hs/vt${i}` },
      };
    else if (i % 13 === 0)
      content = { msgtype: 'm.file', body: `doc${i}.pdf`, url: `mxc://hs/f${i}` };
    else if (i % 23 === 0) {
      type = 'm.sticker';
      content = { body: 'sticker', url: `mxc://hs/s${i}`, info: {} };
    } else if (i % 29 === 0)
      content = { msgtype: 'm.text', body: `see https://example.org/page${i}.` };
    else content = { msgtype: 'm.text', body: `hello ${i}` };
    events.push({
      event_id: `$e${i}`,
      type,
      sender: '@anna:hs',
      origin_server_ts: T0 + i * 60000,
      content,
    });
  }
  // an edit of an image caption (has url in m.new_content and fallback) must not count twice
  events.push({
    event_id: '$edit',
    type: 'm.room.message',
    sender: '@anna:hs',
    origin_server_ts: T0 + n * 60000,
    content: {
      msgtype: 'm.image',
      body: '* new',
      url: 'mxc://hs/img0',
      'm.new_content': { msgtype: 'm.image', url: 'mxc://hs/img0' },
      'm.relates_to': { rel_type: 'm.replace', event_id: '$e0' },
    },
  });
  // a redacted picture
  events.push({
    event_id: '$red',
    type: 'm.room.message',
    sender: '@anna:hs',
    origin_server_ts: T0 + (n + 1) * 60000,
    content: {},
    unsigned: { redacted_because: {} },
  });

  const wire = encrypted
    ? events.map((e) =>
        e.type === 'm.room.message'
          ? {
              ...e,
              type: 'm.room.encrypted',
              content: { algorithm: 'm.megolm.v1.aes-sha2', ciphertext: JSON.stringify(e.content) },
              _clear: e,
            }
          : e
      )
    : events;

  const matches = (e, filter) => {
    if (filter.types && !filter.types.includes(e.type)) return false;
    if (filter.contains_url && !(typeof e.content?.url === 'string')) return false;
    return true;
  };
  const server = {
    requests: 0,
    fetchPage(filter) {
      return async (dir, from, limit) => {
        server.requests += 1;
        let pos = from === undefined ? (dir === 'b' ? wire.length : 0) : Number(from.slice(1));
        const chunk = [];
        if (dir === 'b') {
          while (pos > 0 && chunk.length < limit) {
            pos -= 1;
            if (matches(wire[pos], filter)) chunk.push(wire[pos]);
          }
          return chunk.length ? { chunk, end: `t${pos}` } : { chunk: [] };
        }
        while (pos < wire.length && chunk.length < limit) {
          if (matches(wire[pos], filter)) chunk.push(wire[pos]);
          pos += 1;
        }
        return chunk.length ? { chunk, end: `t${pos}` } : { chunk: [], end: from };
      };
    },
    fetchContext(filter) {
      return async (eventId, limit) => {
        server.requests += 1;
        const idx = wire.findIndex((e) => e.event_id === eventId);
        const half = Math.floor(limit / 2);
        const before = [];
        let b = idx;
        while (b > 0 && before.length < half) {
          b -= 1;
          if (matches(wire[b], filter)) before.push(wire[b]);
        }
        const after = [];
        let a = idx + 1;
        while (a < wire.length && after.length < half) {
          if (matches(wire[a], filter)) after.push(wire[a]);
          a += 1;
        }
        return {
          event: wire[idx],
          events_before: before,
          events_after: after,
          start: b > 0 ? `t${b}` : undefined,
          end: a < wire.length ? `t${a}` : undefined,
        };
      };
    },
  };
  const expected = (category, includeStickers) =>
    events
      .map((e) => classifyEvent(e, { category, includeStickers }))
      .filter(Boolean)
      .map((it) => it.eventId);
  return { events, wire, server, expected };
}

const decryptFake = async (ev) => (ev._clear ? ev._clear : ev);

function walkerFor(
  room,
  {
    category = 'media',
    encrypted = false,
    includeStickers = false,
    pageLimit = 20,
    maxPagesPerCall,
  } = {}
) {
  const filter = buildRoomEventFilter(category, encrypted, includeStickers);
  return new GalleryWalker({
    fetchPage: room.server.fetchPage(filter),
    fetchContext: room.server.fetchContext(filter),
    decrypt: encrypted ? decryptFake : undefined,
    classify: (ev) => classifyEvent(ev, { category, includeStickers }),
    pageLimit,
    maxPagesPerCall,
  });
}

async function walkAll(w) {
  for (let guard = 0; guard < 500; guard += 1) {
    const s = w.getSnapshot();
    if (s.atStart && s.atEnd) return;
    if (!s.atStart) await w.loadOlder();
    if (!w.getSnapshot().atEnd) await w.loadNewer();
  }
  throw new Error('walk did not finish');
}

// ---------------------------------------------------------------- walker
test('filter: server-side contains_url only for unencrypted rooms; stickers only on request', () => {
  assert.deepEqual(buildRoomEventFilter('media', false), {
    types: ['m.room.message'],
    lazy_load_members: true,
    contains_url: true,
  });
  assert.deepEqual(buildRoomEventFilter('media', false, true).types, [
    'm.room.message',
    'm.sticker',
  ]);
  const enc = buildRoomEventFilter('media', true);
  assert.ok(enc.types.includes('m.room.encrypted'));
  assert.equal(enc.contains_url, undefined, 'contains_url would hide every encrypted picture');
  assert.equal(buildRoomEventFilter('links', false).contains_url, undefined);
});

test('classify: images and videos, never edits or redactions, stickers off by default', () => {
  const room = makeRoom({ n: 60 });
  const kinds = room.events
    .map((e) => classifyEvent(e, { category: 'media' })?.kind)
    .filter(Boolean);
  assert.ok(kinds.every((k) => k === 'image' || k === 'video'));
  assert.equal(
    classifyEvent(
      room.events.find((e) => e.event_id === '$edit'),
      { category: 'media' }
    ),
    undefined
  );
  assert.equal(
    classifyEvent(
      room.events.find((e) => e.event_id === '$red'),
      { category: 'media' }
    ),
    undefined
  );
  const sticker = room.events.find((e) => e.type === 'm.sticker');
  assert.equal(classifyEvent(sticker, { category: 'media' }), undefined);
  assert.equal(
    classifyEvent(sticker, { category: 'media', includeStickers: true }).kind,
    'sticker'
  );
  assert.equal(classifyEvent(room.events[13], { category: 'files' }).kind, 'file');
});

test('opening on a picture in the middle loads only a window around it', async () => {
  const room = makeRoom({ n: 400 });
  const w = walkerFor(room, { pageLimit: 20 });
  await w.init('$e200');
  const s = w.getSnapshot();
  assert.ok(
    s.items.some((it) => it.eventId === '$e200'),
    'the tapped picture is in the list'
  );
  assert.ok(s.items.length <= 21, `only a window is loaded, got ${s.items.length}`);
  assert.equal(s.atStart, false);
  assert.equal(s.atEnd, false);
  assert.equal(w.requests, 1, 'one /context request');
});

test('walking to both ends finds every picture/video exactly once, in order', async () => {
  const room = makeRoom({ n: 400 });
  const w = walkerFor(room, { pageLimit: 15 });
  await w.init('$e200');
  await walkAll(w);
  const ids = w.getSnapshot().items.map((it) => it.eventId);
  assert.deepEqual(ids, room.expected('media', false));
  assert.equal(new Set(ids).size, ids.length, 'no duplicates');
  const ts = w.getSnapshot().items.map((it) => it.ts);
  assert.deepEqual(
    ts,
    [...ts].sort((a, b) => a - b),
    'oldest -> newest'
  );
});

test('ensureAround only fetches when close to an unreached edge', async () => {
  const room = makeRoom({ n: 400 });
  const w = walkerFor(room, { pageLimit: 20 });
  await w.init('$e200');
  const before = w.requests;
  const mid = w.indexOf('$e200');
  w.ensureAround(mid, 3);
  assert.equal(w.requests, before, 'in the middle: nothing fetched');
  w.ensureAround(0, 3);
  await w.loadOlder(); // joins the in-flight request
  assert.equal(w.requests, before + 1, 'at the old edge: exactly one page');
  assert.ok(w.indexOf('$e200') > mid, 'older items were prepended, the anchor moved right');
});

test('concurrent loadOlder calls share one request', async () => {
  const room = makeRoom({ n: 400 });
  const w = walkerFor(room, { pageLimit: 20 });
  await w.init('$e200');
  const r = w.requests;
  await Promise.all([w.loadOlder(), w.loadOlder(), w.loadOlder()]);
  assert.equal(w.requests, r + 1);
});

test('encrypted room: decrypts, classifies client-side, skips media-less pages', async () => {
  const room = makeRoom({ n: 300, encrypted: true });
  const w = walkerFor(room, { encrypted: true, pageLimit: 3, maxPagesPerCall: 10 });
  await w.init('$e150');
  await walkAll(w);
  assert.deepEqual(
    w.getSnapshot().items.map((it) => it.eventId),
    room.expected('media', false)
  );
});

test('stickers toggle includes them', async () => {
  const room = makeRoom({ n: 200 });
  const w = walkerFor(room, { includeStickers: true, pageLimit: 25 });
  await w.init('$e100');
  await walkAll(w);
  const ids = w.getSnapshot().items.map((it) => it.eventId);
  assert.deepEqual(ids, room.expected('media', true));
  assert.ok(w.getSnapshot().items.some((it) => it.kind === 'sticker'));
});

test('grid mode (no anchor) starts at the newest end and pages back', async () => {
  const room = makeRoom({ n: 400 });
  const w = walkerFor(room, { pageLimit: 10 });
  await w.init();
  const s = w.getSnapshot();
  assert.equal(s.atEnd, true);
  const all = room.expected('media', false);
  assert.deepEqual(
    s.items.map((i) => i.eventId),
    all.slice(-s.items.length),
    'the newest ones first'
  );
  await walkAll(w);
  assert.deepEqual(
    w.getSnapshot().items.map((i) => i.eventId),
    all
  );
});

test('seeded item shows immediately and is not duplicated by /context', async () => {
  const room = makeRoom({ n: 100 });
  const w = walkerFor(room, { pageLimit: 10 });
  w.seed(classifyEvent(room.events[50], { category: 'media' }));
  assert.equal(w.getSnapshot().items.length, 1);
  await w.init('$e50');
  const ids = w.getSnapshot().items.map((i) => i.eventId);
  assert.equal(ids.filter((id) => id === '$e50').length, 1);
});

test('a failing server is reported, not thrown', async () => {
  const w = new GalleryWalker({
    fetchPage: async () => {
      throw new Error('boom');
    },
    classify: () => undefined,
  });
  await w.init();
  assert.match(w.getSnapshot().error ?? '', /boom/);
});

test('files and links categories', async () => {
  const room = makeRoom({ n: 200 });
  const files = walkerFor(room, { category: 'files', pageLimit: 50 });
  await files.init();
  await walkAll(files);
  assert.deepEqual(
    files.getSnapshot().items.map((i) => i.eventId),
    room.expected('files')
  );
  const links = walkerFor(room, { category: 'links', pageLimit: 50 });
  await links.init();
  await walkAll(links);
  assert.ok(links.getSnapshot().items.length > 0);
  assert.equal(links.getSnapshot().items[0].links[0].endsWith('.'), false, 'trailing dot trimmed');
  assert.deepEqual(extractLinks('a https://x.y/z, and http://q.r/s) end'), [
    'https://x.y/z',
    'http://q.r/s',
  ]);
});

test('walker cache is a small LRU', () => {
  const c = new WalkerCache(2);
  c.set('a', 1);
  c.set('b', 2);
  c.get('a');
  c.set('c', 3);
  assert.equal(c.get('b'), undefined, 'least recently used dropped');
  assert.equal(c.get('a'), 1);
  assert.equal(c.size, 2);
});

// ---------------------------------------------------------------- avatar history
const member = (i, avatar, { name = 'Anna', membership = 'join', prev } = {}) => ({
  event_id: `$m${i}`,
  type: 'm.room.member',
  sender: '@whatsapp_41790000000:hs',
  state_key: '@whatsapp_41790000000:hs',
  origin_server_ts: T0 + i * DAY,
  content: { membership, displayname: name, ...(avatar ? { avatar_url: avatar } : {}) },
  ...(prev ? { unsigned: { prev_content: prev } } : {}),
});
const WA = '@whatsapp_41790000000:hs';

test('four picture changes -> four entries, newest first, with dates', () => {
  const events = [
    member(0, 'mxc://hs/a1'),
    member(10, 'mxc://hs/a1', { name: 'Anna B' }), // name change only
    member(20, 'mxc://hs/a2'),
    member(30, 'mxc://hs/a3'),
    member(40, 'mxc://hs/a4'),
    {
      event_id: '$other',
      type: 'm.room.member',
      state_key: '@someone:hs',
      origin_server_ts: T0 + 45 * DAY,
      content: { membership: 'join', avatar_url: 'mxc://hs/zz' },
    },
  ];
  const h = extractMemberAvatarHistory([...events].reverse(), WA, 'mxc://hs/a4');
  assert.deepEqual(
    h.map((e) => e.mxc),
    ['mxc://hs/a4', 'mxc://hs/a3', 'mxc://hs/a2', 'mxc://hs/a1']
  );
  assert.equal(h[0].current, true);
  assert.equal(h[0].since, T0 + 40 * DAY);
  assert.equal(h[3].since, T0, 'a run of the same picture dates from its first event');
  assert.equal(h[1].until, T0 + 40 * DAY, 'replaced when the newer one was set');
  assert.match(describeHistoryEntry(h[0], 'en-GB'), /^Current picture · set 10 Feb 2026$/);
  assert.match(describeHistoryEntry(h[2], 'en-GB'), /^Set 21 Jan 2026 · replaced 31 Jan 2026$/);
});

test('bridge set the picture once -> only the current one', () => {
  const h = extractMemberAvatarHistory([member(5, 'mxc://hs/only')], WA, 'mxc://hs/only');
  assert.equal(h.length, 1);
  assert.equal(h[0].current, true);
});

test('no member events found -> the current picture from room state', () => {
  const h = extractMemberAvatarHistory([], WA, 'mxc://hs/now');
  assert.deepEqual(
    h.map((e) => e.mxc),
    ['mxc://hs/now']
  );
  assert.equal(describeHistoryEntry(h[0]), 'Current picture');
});

test('identical pictures in a row are merged, also across a removal', () => {
  const h = extractMemberAvatarHistory(
    [
      member(1, 'mxc://hs/a'),
      member(2, undefined),
      member(3, 'mxc://hs/a'),
      member(4, 'mxc://hs/b'),
    ],
    WA,
    'mxc://hs/b'
  );
  assert.deepEqual(
    h.map((e) => e.mxc),
    ['mxc://hs/b', 'mxc://hs/a']
  );
});

test('prev_content of the oldest event adds the picture before it', () => {
  const h = extractMemberAvatarHistory(
    [member(7, 'mxc://hs/new', { prev: { membership: 'join', avatar_url: 'mxc://hs/older' } })],
    WA,
    'mxc://hs/new'
  );
  assert.deepEqual(
    h.map((e) => e.mxc),
    ['mxc://hs/new', 'mxc://hs/older']
  );
  assert.equal(h[1].before, T0 + 7 * DAY);
  assert.match(describeHistoryEntry(h[1], 'en-GB'), /^Used before 8 Jan 2026$/);
});

test('leave events are ignored (they carry no picture)', () => {
  const h = extractMemberAvatarHistory(
    [member(1, 'mxc://hs/a'), member(2, undefined, { membership: 'leave' })],
    WA,
    'mxc://hs/a'
  );
  assert.deepEqual(
    h.map((e) => e.mxc),
    ['mxc://hs/a']
  );
});

test('room picture history (stale m.room.avatar in a bridged DM)', () => {
  const ra = (i, url) => ({
    event_id: `$r${i}`,
    type: 'm.room.avatar',
    state_key: '',
    origin_server_ts: T0 + i * DAY,
    content: url ? { url } : {},
  });
  const h = extractRoomAvatarHistory([ra(1, 'mxc://hs/r1'), ra(9, 'mxc://hs/r2')], 'mxc://hs/r2');
  assert.deepEqual(
    h.map((e) => [e.mxc, e.source]),
    [
      ['mxc://hs/r2', 'room'],
      ['mxc://hs/r1', 'room'],
    ]
  );
});

test('history pagination stops at the start and is bounded', async () => {
  const pages = [
    { chunk: [member(3, 'mxc://hs/c')], end: 'p1' },
    { chunk: [member(2, 'mxc://hs/b')], end: 'p2' },
    { chunk: [] },
  ];
  let i = 0;
  const r = await collectHistoryEvents(async () => pages[i++]);
  assert.equal(r.complete, true);
  assert.equal(r.events.length, 2);
  let n = 0;
  const bounded = await collectHistoryEvents(
    async () => ({ chunk: [member(n, 'mxc://hs/x')], end: `p${++n}` }),
    5
  );
  assert.equal(bounded.complete, false);
  assert.equal(bounded.requests, 5);
  assert.deepEqual(memberHistoryFilter(WA).senders, [WA]);
});
