import { describe, expect, it } from 'vitest';
import { isOnline, sortFriends } from './presence';

describe('isOnline', () => {
  it('treats online and unavailable as online', () => {
    expect(isOnline('online')).toBe(true);
    expect(isOnline('unavailable')).toBe(true);
  });

  it('treats offline and unknown presence as offline', () => {
    expect(isOnline('offline')).toBe(false);
    expect(isOnline(undefined)).toBe(false);
  });
});

describe('sortFriends', () => {
  it('puts online friends first, then sorts by name; unknown presence is offline', () => {
    const friends = [{ userId: '@c' }, { userId: '@a' }, { userId: '@b' }];
    const presence: Record<string, string> = { '@c': 'online' };
    const names: Record<string, string> = { '@c': 'carl', '@a': 'Ann', '@b': 'bob' };

    const sorted = sortFriends(
      friends,
      (id) => presence[id],
      (id) => names[id]
    );

    expect(sorted.map((f) => f.userId)).toEqual(['@c', '@a', '@b']);
    expect(friends.map((f) => f.userId)).toEqual(['@c', '@a', '@b']);
    expect(sorted).not.toBe(friends);
  });
});
