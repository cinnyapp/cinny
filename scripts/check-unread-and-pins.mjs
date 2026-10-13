// Checks the pure helpers behind "Mark as unread" and the pinned banner.
//
// This repo has no test runner (no vitest/jest), so rather than pulling one in
// just for two modules, this script compiles them with the repo's own esbuild
// and asserts against them with node's built-in `assert`. Run it from the repo
// root:  node scripts/check-unread-and-pins.mjs
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const SRC = new URL('../src/', import.meta.url).pathname;
const SDK_EVENT_TYPES = new URL(
  '../node_modules/matrix-js-sdk/lib/@types/event.js',
  import.meta.url
).pathname;
const outDir = mkdtempSync(join(tmpdir(), 'cinny-check-'));
process.on('exit', () => rmSync(outDir, { recursive: true, force: true }));

const compile = async (entry, name, alias = {}) => {
  const outfile = join(outDir, name);
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    external: ['matrix-js-sdk'],
    alias,
  });
  return import(pathToFileURL(outfile).href);
};

const mu = await compile(`${SRC}app/utils/markedUnread.ts`, 'markedUnread.mjs');
const pt = await compile(
  `${SRC}app/features/room/room-pin-banner/pinnedEventText.ts`,
  'pinnedEventText.mjs',
  { 'matrix-js-sdk/lib/@types/event': SDK_EVENT_TYPES }
);

// ---------- marked unread: flag parsing ----------
const room = (data) => ({
  getAccountData: (type) => (type in data ? { getContent: () => data[type] } : undefined),
});
const S = mu.MARKED_UNREAD_TYPE_STABLE;
const U = mu.MARKED_UNREAD_TYPE_UNSTABLE;

assert.equal(S, 'm.marked_unread');
assert.equal(U, 'com.famedly.marked_unread');

assert.equal(mu.getMarkedUnreadState(room({})), undefined, 'no event => undefined');
assert.equal(mu.isRoomMarkedUnread(room({})), false, 'no event => not marked (spec: MUST)');
assert.equal(mu.getMarkedUnreadState(room({ [S]: { unread: true } })), true, 'stable true');
assert.equal(mu.getMarkedUnreadState(room({ [S]: { unread: false } })), false, 'stable false');
assert.equal(mu.getMarkedUnreadState(room({ [U]: { unread: true } })), true, 'unstable fallback');
// stable wins over unstable, in both directions
assert.equal(
  mu.getMarkedUnreadState(room({ [S]: { unread: false }, [U]: { unread: true } })),
  false,
  'stable false must win over unstable true'
);
assert.equal(
  mu.getMarkedUnreadState(room({ [S]: { unread: true }, [U]: { unread: false } })),
  true,
  'stable true must win over unstable false'
);
// junk content must not be read as a flag
assert.equal(mu.getMarkedUnreadState(room({ [S]: {} })), undefined, 'missing field => undefined');
assert.equal(
  mu.getMarkedUnreadState(room({ [S]: { unread: 'yes' } })),
  undefined,
  'non-boolean ignored'
);
assert.equal(
  mu.getMarkedUnreadState(room({ [S]: { unread: 'yes' }, [U]: { unread: true } })),
  true,
  'junk stable falls through to unstable'
);
assert.equal(mu.isMarkedUnreadType(S), true);
assert.equal(mu.isMarkedUnreadType(U), true);
assert.equal(mu.isMarkedUnreadType('m.fully_read'), false, 'must never claim m.fully_read');
assert.equal(mu.isMarkedUnreadType('m.receipt'), false);

// ---------- marked unread: writes ----------
const makeMx = (data) => {
  const calls = [];
  return {
    calls,
    getRoom: () => room(data),
    setRoomAccountData: async (roomId, type, content) => {
      calls.push([type, content]);
      data[type] = content;
    },
  };
};

let mx = makeMx({});
await mu.setMarkedUnreadState(mx, '!r', true);
assert.deepEqual(mx.calls, [[S, { unread: true }]], 'marks via the STABLE key only');

mx = makeMx({ [S]: { unread: true } });
await mu.setMarkedUnreadState(mx, '!r', true);
assert.deepEqual(mx.calls, [], 'no-op write skipped (bulk Mark-as-Read must not PUT thousands)');

mx = makeMx({ [S]: { unread: true } });
await mu.setMarkedUnreadState(mx, '!r', false);
assert.deepEqual(mx.calls, [[S, { unread: false }]], 'clears the stable key');

mx = makeMx({});
await mu.setMarkedUnreadState(mx, '!r', false);
assert.deepEqual(mx.calls, [], 'clearing an unmarked room is free');

mx = makeMx({ [U]: { unread: true } });
await mu.setMarkedUnreadState(mx, '!r', false);
assert.deepEqual(
  mx.calls,
  [
    [S, { unread: false }],
    [U, { unread: false }],
  ],
  'a legacy FluffyChat flag is migrated/cleared too, else the room is stuck unread there'
);

mx = makeMx({ [U]: { unread: true } });
await mu.setMarkedUnreadState(mx, '!r', true);
assert.deepEqual(mx.calls, [], 'already unread via the legacy key => nothing to write');

mx = { getRoom: () => undefined, setRoomAccountData: () => assert.fail('unknown room') };
await mu.setMarkedUnreadState(mx, '!gone', true);

// ---------- pinned banner snippet ----------
const evt = (o = {}) => ({
  isRedacted: () => o.redacted ?? false,
  getType: () => o.type ?? 'm.room.message',
  isDecryptionFailure: () => o.decryptionFailure ?? false,
  getContent: () => o.content ?? {},
});
assert.equal(pt.getPinnedEventSnippet(evt({ content: { body: 'hello there' } })), 'hello there');
assert.equal(
  pt.getPinnedEventSnippet(evt({ content: { body: ' a \n\n  b\tc ' } })),
  'a b c',
  'newlines collapse so the bar stays one line'
);
assert.equal(
  pt.getPinnedEventSnippet(evt({ redacted: true, content: { body: 'x' } })),
  'Message deleted'
);
assert.equal(pt.getPinnedEventSnippet(evt({ type: 'm.room.encrypted' })), 'Encrypted message');
assert.equal(
  pt.getPinnedEventSnippet(evt({ type: 'm.room.encrypted', decryptionFailure: true })),
  'Unable to decrypt message'
);
assert.equal(pt.getPinnedEventSnippet(evt({ type: 'm.sticker' })), 'Sticker');
assert.equal(
  pt.getPinnedEventSnippet(evt({ content: { msgtype: 'm.image', body: 'cat.png' } })),
  'cat.png'
);
assert.equal(
  pt.getPinnedEventSnippet(evt({ content: { msgtype: 'm.image' } })),
  'Image',
  'a body-less image still reads as something'
);
assert.equal(pt.getPinnedEventSnippet(evt({ content: {} })), 'Message', 'never blank');
assert.equal(
  pt.getPinnedEventSnippet(evt({ content: { body: 42 } })),
  'Message',
  'non-string body'
);
const long = pt.getPinnedEventSnippet(evt({ content: { body: 'x'.repeat(500) } }));
assert.equal(long.length, 140);
assert.ok(long.endsWith('…'), 'long text is elided');

console.log('ALL CHECKS PASSED');
