import { describe, expect, it } from 'vitest';
import { addToast, removeToast } from './toast';

describe('toasts', () => {
  it('appends toasts with unique ids and removes them by id', () => {
    const one = addToast([], 'Invited ana', 'Success');
    const two = addToast(one, 'Invited bob', 'Success');
    expect(two.map((t) => t.message)).toEqual(['Invited ana', 'Invited bob']);
    expect(two[0].id).not.toBe(two[1].id);

    expect(removeToast(two, two[0].id).map((t) => t.message)).toEqual(['Invited bob']);
  });
});
