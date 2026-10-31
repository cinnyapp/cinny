#!/usr/bin/env node
/**
 * Unit tests for the 🎤 popover's lookup → poll state machine
 * (src/app/features/transcription/transcriptFlow.ts) and the payload parser
 * (transcribeApi.ts parseTranscriptPayload).
 *
 *   npm run test:transcript-flow
 *
 * Time is fake: sleep() advances a virtual clock, so the 2-minute poll window
 * runs in milliseconds.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runTranscriptFlow,
  pollForBetter,
  describeTranscript,
  POLL_INTERVAL_MS,
  MAX_POLL_MS,
} from '../src/app/features/transcription/transcriptFlow.ts';
import { parseTranscriptPayload } from '../src/app/features/transcription/transcribeApi.ts';

const clock = () => {
  let t = 0;
  const sleeps = [];
  return {
    now: () => t,
    sleep: async (ms) => {
      sleeps.push(ms);
      t += ms;
    },
    sleeps,
  };
};

const done = (text, extra = {}) => ({ text, status: 'done', source: 'daemon', ...extra });
const draft = (text, extra = {}) => ({
  text,
  status: 'improving',
  source: 'daemon',
  model: 'tiny',
  ...extra,
});

test('a finished daemon transcript is shown once and never polled', async () => {
  const c = clock();
  const shown = [];
  let polls = 0;
  const r = await runTranscriptFlow({
    request: async () => done('hello', { model: 'large-v3' }),
    poll: async () => {
      polls += 1;
      return undefined;
    },
    onUpdate: (x) => shown.push(x.text),
    ...c,
  });
  assert.equal(r.text, 'hello');
  assert.deepEqual(shown, ['hello']);
  assert.equal(polls, 0);
  assert.equal(c.sleeps.length, 0);
});

test('a live (fallback) transcript is final too', async () => {
  const c = clock();
  const r = await runTranscriptFlow({
    request: async () => ({ text: 'live', status: 'done', source: 'live' }),
    poll: async () => assert.fail('must not poll'),
    onUpdate: () => {},
    ...c,
  });
  assert.equal(r.source, 'live');
});

test('a draft is shown immediately, then swapped for the better version', async () => {
  const c = clock();
  const shown = [];
  const answers = [
    draft('tiny draft'), // unchanged -> no update
    draft('turbo text', { model: 'large-v3-turbo' }),
    done('Best, polished.', { model: 'large-v3', polished: true }),
  ];
  const r = await runTranscriptFlow({
    request: async () => draft('tiny draft'),
    poll: async () => answers.shift(),
    onUpdate: (x) => shown.push(`${x.status}:${x.text}`),
    ...c,
  });
  assert.deepEqual(shown, ['improving:tiny draft', 'improving:turbo text', 'done:Best, polished.']);
  assert.equal(r.status, 'done');
  assert.ok(
    c.sleeps.every((ms) => ms === POLL_INTERVAL_MS),
    'polls every 5 s'
  );
  assert.equal(c.sleeps.length, 3);
});

test('polling gives up after 2 minutes and keeps the draft', async () => {
  const c = clock();
  let polls = 0;
  const r = await runTranscriptFlow({
    request: async () => draft('still a draft'),
    poll: async () => {
      polls += 1;
      return draft('still a draft');
    },
    onUpdate: () => {},
    ...c,
  });
  assert.equal(r.status, 'improving');
  assert.equal(r.text, 'still a draft');
  assert.equal(polls, MAX_POLL_MS / POLL_INTERVAL_MS);
  assert.ok(c.now() <= MAX_POLL_MS);
});

test('poll errors and empty answers are ignored, not shown', async () => {
  const c = clock();
  const shown = [];
  const answers = [
    () => {
      throw new Error('network');
    },
    () => undefined,
    () => ({ text: '', status: 'none' }),
    () => ({ text: 'x', status: 'pending' }),
    () => done('final'),
  ];
  const r = await runTranscriptFlow({
    request: async () => draft('draft'),
    poll: async () => answers.shift()(),
    onUpdate: (x) => shown.push(x.text),
    ...c,
  });
  assert.deepEqual(shown, ['draft', 'final']);
  assert.equal(r.text, 'final');
});

test('closing the chat (unmount) stops polling and updates', async () => {
  const c = clock();
  let cancelled = false;
  let polls = 0;
  const shown = [];
  await runTranscriptFlow({
    request: async () => draft('draft'),
    poll: async () => {
      polls += 1;
      cancelled = true;
      return done('too late');
    },
    onUpdate: (x) => shown.push(x.text),
    isCancelled: () => cancelled,
    ...c,
  });
  assert.equal(polls, 1);
  assert.deepEqual(shown, ['draft'], 'nothing is set after unmount');
});

test('a failed first request rejects (popover shows the error + Retry)', async () => {
  await assert.rejects(
    runTranscriptFlow({
      request: async () => {
        throw new Error('502');
      },
      poll: async () => undefined,
      onUpdate: () => assert.fail('nothing to show'),
    }),
    /502/
  );
});

test('pollForBetter resumes from a draft when the popover is reopened', async () => {
  const c = clock();
  const r = await pollForBetter(draft('d'), {
    poll: async () => done('better'),
    onUpdate: () => {},
    ...c,
  });
  assert.equal(r.text, 'better');
});

test('parse: full lookup-first payload', () => {
  const p = parseTranscriptPayload({
    text: 'Hallo',
    detected_language: 'de',
    source: 'daemon',
    model: 'large-v3',
    polished: true,
    ts: 1792505923000,
    status: 'done',
  });
  assert.deepEqual(p, {
    text: 'Hallo',
    detectedLanguage: 'de',
    source: 'daemon',
    model: 'large-v3',
    polished: true,
    ts: 1792505923000,
    status: 'done',
  });
});

test('parse: an old backend reply {text, detected_language} is a finished transcript', () => {
  const p = parseTranscriptPayload({ text: 'hi', detected_language: 'en' });
  assert.equal(p.status, 'done');
  assert.equal(p.source, undefined);
  assert.equal(p.polished, false);
});

test('parse: junk is dropped, never trusted', () => {
  const p = parseTranscriptPayload({
    text: 42,
    source: '<script>',
    status: 'hacked',
    ts: 'soon',
    polished: 'yes',
  });
  assert.equal(p.text, '');
  assert.equal(p.source, undefined);
  assert.equal(p.status, 'none');
  assert.equal(p.ts, undefined);
  assert.equal(p.polished, false);
  assert.equal(parseTranscriptPayload(null).status, 'none');
});

const fmt = () => '20.10.26, 14:02';
test('label: automatic transcript says so, with model and time', () => {
  const d = describeTranscript(done('x', { model: 'large-v3', polished: true, ts: 1 }), {
    polling: false,
    formatTime: fmt,
  });
  assert.equal(d.origin, 'From automatic transcription · large-v3 · polished · 20.10.26, 14:02');
  assert.equal(d.progress, undefined);
});

test('label: live fallback says "just now" and no stored time', () => {
  const d = describeTranscript(
    { text: 'x', status: 'done', source: 'live', model: 'large-v3-turbo', ts: 5 },
    { polling: false, formatTime: fmt }
  );
  assert.equal(d.origin, 'Transcribed just now · large-v3-turbo');
});

test('label: a draft explains that a better version is coming', () => {
  assert.match(
    describeTranscript(draft('x'), { polling: true, formatTime: fmt }).progress,
    /on its way/
  );
  assert.match(
    describeTranscript(draft('x'), { polling: false, formatTime: fmt }).progress,
    /Open again/
  );
});
