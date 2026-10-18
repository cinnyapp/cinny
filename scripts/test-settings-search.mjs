#!/usr/bin/env node
/**
 * Unit tests for the Settings search matcher and index.
 *
 *   npm run test:settings-search
 *
 * Runs with node's built-in test runner and --experimental-strip-types, the
 * same way scripts/test-lite-mode.mjs does, so the real TypeScript source is
 * under test rather than a copy.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import {
  fuzzyMatch,
  highlightChunks,
  mergeRanges,
} from '../src/app/features/settings/search/fuzzyMatch.ts';
import { searchSettings } from '../src/app/features/settings/search/settingsIndex.ts';
import { SETTINGS_INDEX } from '../src/app/features/settings/search/settingsIndex.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('matches a prefix with the highest score', () => {
  const prefix = fuzzyMatch('page', 'Page Zoom');
  const middle = fuzzyMatch('zoom', 'Page Zoom');
  assert.ok(prefix);
  assert.ok(middle);
  assert.ok(prefix.score > middle.score, 'a prefix should beat a word in the middle');
});

test('is case insensitive', () => {
  assert.ok(fuzzyMatch('PAGE ZOOM', 'Page Zoom'));
  assert.ok(fuzzyMatch('page zoom', 'PAGE ZOOM'));
});

test('matches a word that starts inside the text', () => {
  const m = fuzzyMatch('zoom', 'Page Zoom');
  assert.ok(m);
  assert.deepEqual(m.ranges, [{ start: 5, end: 9 }]);
});

test('matches characters in order (fuzzy)', () => {
  const m = fuzzyMatch('pgzm', 'Page Zoom');
  assert.ok(m, 'subsequence should match');
  assert.ok(m.score < 600, 'a loose subsequence must score below a substring hit');
});

test('does not match when a character is missing or out of order', () => {
  assert.equal(fuzzyMatch('zoomq', 'Page Zoom'), null);
  assert.equal(fuzzyMatch('zoompage', 'Page Zoom'), null);
});

test('every word of a multi-word query must match', () => {
  assert.ok(fuzzyMatch('pinned banner', 'Show Pinned Message Banner'));
  assert.equal(fuzzyMatch('pinned sticker', 'Show Pinned Message Banner'), null);
});

test('an empty query never matches', () => {
  assert.equal(fuzzyMatch('', 'Page Zoom'), null);
  assert.equal(fuzzyMatch('   ', 'Page Zoom'), null);
});

test('shorter titles win when the match is otherwise equal', () => {
  const short = fuzzyMatch('theme', 'Theme');
  const long = fuzzyMatch('theme', 'Theme selection for the whole application window');
  assert.ok(short.score > long.score);
});

test('mergeRanges merges overlapping and adjacent ranges', () => {
  assert.deepEqual(
    mergeRanges([
      { start: 5, end: 7 },
      { start: 0, end: 2 },
      { start: 2, end: 4 },
      { start: 6, end: 9 },
    ]),
    [
      { start: 0, end: 4 },
      { start: 5, end: 9 },
    ]
  );
});

test('highlightChunks returns the whole text, in order', () => {
  const text = 'Show Pinned Message Banner';
  const m = fuzzyMatch('pinned', text);
  const chunks = highlightChunks(text, m.ranges);
  assert.equal(chunks.map((c) => c.text).join(''), text);
  assert.deepEqual(
    chunks.filter((c) => c.hit).map((c) => c.text),
    ['Pinned']
  );
});

test('highlightChunks with no ranges returns the text unhighlighted', () => {
  assert.deepEqual(highlightChunks('Theme', []), [{ text: 'Theme', hit: false }]);
});

// ---------------------------------------------------------------- index ----

test('the index covers every settings page', () => {
  const pages = new Set(SETTINGS_INDEX.map((e) => e.pageName));
  [
    'General',
    'Account',
    'Notifications',
    'Devices',
    'Emojis & Stickers',
    'Translation',
    'Developer Tools',
    'About',
  ].forEach((page) => assert.ok(pages.has(page), `missing page: ${page}`));
});

test('searching an exact setting name puts it first', () => {
  const cases = [
    ['page zoom', 'Page Zoom'],
    ['message layout', 'Message Layout'],
    ['desktop notifications', 'Desktop Notifications'],
    ['access token', 'Access Token'],
  ];
  cases.forEach(([query, expected]) => {
    const [top] = searchSettings(query);
    assert.ok(top, `no result for "${query}"`);
    assert.equal(top.entry.title, expected, `"${query}" should find "${expected}"`);
  });
});

test('searching by what you would actually type (synonyms) works', () => {
  const cases = [
    ['dark mode', 'General'],
    ['slow', 'General'],
    ['whisper', 'General'],
    ['blue ticks', 'General'],
    ['logout', 'Devices'],
    ['avatar', 'Account'],
  ];
  cases.forEach(([query, expectedPage]) => {
    const results = searchSettings(query);
    assert.ok(results.length > 0, `no result for "${query}"`);
    assert.ok(
      results.slice(0, 5).some((r) => r.entry.pageName === expectedPage),
      `"${query}" should surface something on ${expectedPage}`
    );
  });
});

test('searching a section or page name lists that page', () => {
  const results = searchSettings('notifications');
  assert.ok(results.some((r) => r.entry.pageName === 'Notifications'));
});

test('an empty query returns nothing (the plain menu is shown instead)', () => {
  assert.deepEqual(searchSettings(''), []);
  assert.deepEqual(searchSettings('   '), []);
});

test('nonsense returns nothing', () => {
  assert.deepEqual(searchSettings('qqqzzzxxxwww'), []);
});

test('results are sorted best-first', () => {
  const results = searchSettings('theme');
  for (let i = 1; i < results.length; i += 1) {
    assert.ok(results[i - 1].score >= results[i].score, 'scores must not increase');
  }
});

test('the title highlight ranges stay inside the title', () => {
  searchSettings('message').forEach(({ entry, titleMatch }) => {
    (titleMatch?.ranges ?? []).forEach((r) => {
      assert.ok(r.start >= 0 && r.end <= entry.title.length, `bad range on "${entry.title}"`);
    });
  });
});

test('the generated index is up to date with the settings source', () => {
  // Fails when somebody adds a <SettingTile title="…"> and forgets to run
  // `node scripts/build-settings-index.mjs` — i.e. a setting nobody can find.
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-settings-index.mjs'), '--check'], {
    stdio: 'pipe',
  });
});
