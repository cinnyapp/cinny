import { describe, expect, it } from 'vitest';
import { createLatestGate } from './latestGate';

describe('createLatestGate', () => {
  it('only the most recently started request is latest', () => {
    const begin = createLatestGate();
    const first = begin();
    expect(first()).toBe(true);
    const second = begin();
    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });

  it('drops a slow earlier response that resolves after a newer one', async () => {
    const begin = createLatestGate();
    const applied: string[] = [];
    const run = async (value: string, delayMs: number) => {
      const isLatest = begin();
      await new Promise((r) => {
        setTimeout(r, delayMs);
      });
      if (isLatest()) applied.push(value);
    };
    await Promise.all([run('slow-poll', 20), run('after-action', 1)]);
    expect(applied).toEqual(['after-action']);
  });

  it('separate gates do not interfere', () => {
    const a = createLatestGate();
    const b = createLatestGate();
    const isA = a();
    b();
    expect(isA()).toBe(true);
  });
});
