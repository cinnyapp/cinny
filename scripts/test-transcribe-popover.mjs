#!/usr/bin/env node
/**
 * Regression test for the transcribe-button crash.
 *
 * Clicking the 🎤 Transcribe button used to take the whole app down with
 *
 *   Unexpected Application Error!
 *   Your focus-trap must have at least one container with at least one
 *   tabbable node in it at all times
 *
 * because the popover opens in its loading state — a heading, a spinner and a
 * line of text, none of them tabbable — and focus-trap-react refuses to
 * activate on a container with nothing to focus.
 *
 * The fix is structural, so this test is structural too: it asserts that the
 * popover always contains a tabbable Close button (rendered unconditionally,
 * not inside a `loading &&` / `result &&` branch) and that the trap is given
 * both an initialFocus and a fallbackFocus. A refactor that reintroduces the
 * crash fails here.
 *
 *   npm run test:transcribe-popover
 */
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'src/app/features/transcription/TranscribeButton.tsx');
const src = fs.readFileSync(FILE, 'utf8');

/** The JSX handed to <FocusTrap> as its single child. */
const trapContent = (() => {
  const start = src.indexOf('<FocusTrap');
  const end = src.indexOf('</FocusTrap>');
  assert.ok(start !== -1 && end > start, 'TranscribeButton must render a FocusTrap');
  return src.slice(start, end);
})();

test('the popover renders a Close button', () => {
  assert.match(trapContent, /aria-label="Close transcript"/);
});

test('the Close button is NOT inside a conditional branch', () => {
  // Everything between the trap opening and the Close button must not open a
  // `{xxx && (` branch that is still open at that point.
  const upToClose = trapContent.slice(0, trapContent.indexOf('aria-label="Close transcript"'));
  const opened = (upToClose.match(/\{\s*!?\w[\w.?]*\s*&&\s*\(/g) ?? []).length;
  const closed = (upToClose.match(/\)\s*\}/g) ?? []).length;
  assert.equal(
    opened,
    closed,
    'the Close button must render in every state (loading / error / empty / done)'
  );
});

test('the Close button is tabbable (a real button, not disabled or tabIndex=-1)', () => {
  const btn = trapContent.slice(
    trapContent.lastIndexOf('<IconButton', trapContent.indexOf('aria-label="Close transcript"')),
    trapContent.indexOf('</IconButton>', trapContent.indexOf('aria-label="Close transcript"'))
  );
  assert.ok(btn.includes('aria-label="Close transcript"'));
  assert.doesNotMatch(btn, /tabIndex=\{-1\}/, 'the Close button must stay tabbable');
  assert.doesNotMatch(btn, /\bdisabled\b/, 'the Close button must never be disabled');
});

test('the focus trap has an initialFocus and a fallbackFocus', () => {
  assert.match(trapContent, /initialFocus:/, 'initialFocus must be set');
  assert.match(
    trapContent,
    /fallbackFocus:/,
    'fallbackFocus must be set so an empty popover can never throw'
  );
});

test('the popover container itself is focusable as the fallback', () => {
  assert.match(trapContent, /<Menu[^>]*tabIndex=\{-1\}/s, 'the Menu must carry tabIndex={-1}');
});

test('the transcript is never rendered as HTML', () => {
  assert.doesNotMatch(src, /dangerouslySetInnerHTML/, 'transcripts are untrusted text');
});

test('the retry path exists, so a failed request is recoverable in place', () => {
  assert.match(trapContent, /Retry/);
  assert.match(src, /onClick=\{runTranscription\}/);
});
