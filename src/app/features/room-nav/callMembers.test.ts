import { describe, expect, it } from 'vitest';
import { uniqueCallUserIds } from './callMembers';

describe('uniqueCallUserIds', () => {
  it('lists each person once, in call order', () => {
    expect(
      uniqueCallUserIds([
        { userId: '@a:x' },
        { userId: '@b:x' },
        { userId: '@a:x' },
        { userId: '' },
      ])
    ).toEqual(['@a:x', '@b:x']);
  });
});
