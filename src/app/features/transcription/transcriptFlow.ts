/**
 * The lookup → poll state machine behind the 🎤 popover (pure, no React).
 *
 * 1. `request()` = POST /transcribe. The server answers instantly from the
 *    automatic transcription when it has the note, or transcribes live.
 * 2. If the answer is a draft (`status: "improving"`), poll the cheap
 *    lookup-only `GET /transcript` every `pollIntervalMs` for at most
 *    `maxPollMs` and hand every better version to `onUpdate`.
 *
 * Poll failures are ignored (the popover keeps the text it has). Everything
 * time-related is injected so the tests can drive it without real timers.
 */
import type { TranscribeResponse } from './transcribeApi';

export const POLL_INTERVAL_MS = 5000;
export const MAX_POLL_MS = 120000;

export type TranscriptFlowDeps = {
  request: () => Promise<TranscribeResponse>;
  poll: () => Promise<TranscribeResponse | undefined>;
  onUpdate: (result: TranscribeResponse) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  isCancelled?: () => boolean;
  pollIntervalMs?: number;
  maxPollMs?: number;
};

const realSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const changed = (a: TranscribeResponse, b: TranscribeResponse): boolean =>
  a.text !== b.text ||
  a.model !== b.model ||
  a.status !== b.status ||
  a.polished !== b.polished ||
  a.source !== b.source;

/** Continue polling from an already-shown draft. Resolves with the last result shown. */
export async function pollForBetter(
  start: TranscribeResponse,
  deps: Omit<TranscriptFlowDeps, 'request'>
): Promise<TranscribeResponse> {
  const sleep = deps.sleep ?? realSleep;
  const now = deps.now ?? Date.now;
  const cancelled = deps.isCancelled ?? (() => false);
  const interval = deps.pollIntervalMs ?? POLL_INTERVAL_MS;
  const maxMs = deps.maxPollMs ?? MAX_POLL_MS;

  let current = start;
  const began = now();
  while (current.status === 'improving' && now() - began < maxMs) {
    // eslint-disable-next-line no-await-in-loop
    await sleep(interval);
    if (cancelled()) return current;
    let next: TranscribeResponse | undefined;
    try {
      // eslint-disable-next-line no-await-in-loop
      next = await deps.poll();
    } catch {
      next = undefined;
    }
    if (cancelled()) return current;
    // Only accept something that still has text: a stored transcript never
    // goes away, so an empty answer is a glitch, not news.
    if (next && next.text && (next.status === 'done' || next.status === 'improving')) {
      if (changed(current, next)) {
        current = next;
        deps.onUpdate(current);
      }
    }
  }
  return current;
}

/** Run the whole flow. Rejects only if the first request fails. */
export async function runTranscriptFlow(deps: TranscriptFlowDeps): Promise<TranscribeResponse> {
  const first = await deps.request();
  if (deps.isCancelled?.()) return first;
  deps.onUpdate(first);
  if (first.status !== 'improving') return first;
  return pollForBetter(first, deps);
}

const formatWhen = (ts: number): string => {
  try {
    return new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
};

/**
 * The small grey line under the transcript: where it came from, which model,
 * when — so it is obvious whether the app re-used the automatic transcript or
 * had to transcribe on the spot.
 */
export function describeTranscript(
  result: TranscribeResponse,
  opts: { polling: boolean; formatTime?: (ts: number) => string }
): { origin: string; progress?: string } {
  const fmt = opts.formatTime ?? formatWhen;
  const parts: string[] = [];
  if (result.source === 'daemon') parts.push('From automatic transcription');
  else if (result.source === 'app') parts.push('Transcribed earlier in the app');
  else parts.push('Transcribed just now');
  if (result.model) parts.push(result.model);
  if (result.polished) parts.push('polished');
  if (result.ts && result.source !== 'live') {
    const when = fmt(result.ts);
    if (when) parts.push(when);
  }
  let progress: string | undefined;
  if (result.status === 'improving') {
    progress = opts.polling
      ? 'Draft — a better version is on its way…'
      : 'Draft — a better version is still being made. Open again in a moment.';
  }
  return { origin: parts.join(' · '), progress };
}
