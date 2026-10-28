import { describe, expect, it } from 'vitest';
import { REJOIN_WINDOW_MS, parseRejoin, serializeRejoin } from './savedCall';

const NOW = Date.parse('2026-10-28T12:00:00Z');
const saved = {
  userId: '@ana:example.org',
  roomId: '!voice:example.org',
  at: NOW - 1000,
  microphone: false,
  video: false,
  sound: true,
};

describe('parseRejoin', () => {
  it('returns the call you were in, with your mic and camera as they were', () => {
    expect(parseRejoin(serializeRejoin(saved), '@ana:example.org', NOW)).toEqual(saved);
  });

  it("ignores nothing saved, broken data and someone else's call", () => {
    expect(parseRejoin(null, '@ana:example.org', NOW)).toBeUndefined();
    expect(parseRejoin('{oops', '@ana:example.org', NOW)).toBeUndefined();
    expect(parseRejoin('null', '@ana:example.org', NOW)).toBeUndefined();
    expect(parseRejoin(serializeRejoin(saved), '@bob:example.org', NOW)).toBeUndefined();
  });

  it('ignores a call left too long ago', () => {
    const old = { ...saved, at: NOW - REJOIN_WINDOW_MS - 1 };
    expect(parseRejoin(serializeRejoin(old), '@ana:example.org', NOW)).toBeUndefined();
  });

  it('defaults to mic and sound on, camera off, when they are missing', () => {
    const raw = JSON.stringify({ userId: saved.userId, roomId: saved.roomId, at: saved.at });
    expect(parseRejoin(raw, '@ana:example.org', NOW)).toMatchObject({
      microphone: true,
      video: false,
      sound: true,
    });
  });
});
