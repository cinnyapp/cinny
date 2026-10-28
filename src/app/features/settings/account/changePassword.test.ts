import { describe, expect, it, vi } from 'vitest';
import { MatrixClient, MatrixError } from 'matrix-js-sdk';
import { changePassword, changePasswordErrorMessage, currentPasswordAuth } from './changePassword';

describe('currentPasswordAuth', () => {
  it('builds an m.login.password auth for the user', () => {
    expect(currentPasswordAuth('@ana:blazeroom.com.br', 'old')).toEqual({
      type: 'm.login.password',
      identifier: { type: 'm.id.user', user: '@ana:blazeroom.com.br' },
      password: 'old',
    });
  });
});

describe('changePassword', () => {
  it('sends the current password as auth and keeps other devices signed in', async () => {
    const setPassword = vi.fn().mockResolvedValue({});
    const mx = {
      getSafeUserId: () => '@ana:blazeroom.com.br',
      setPassword,
    } as unknown as MatrixClient;

    await changePassword(mx, 'old', 'new');

    expect(setPassword).toHaveBeenCalledWith(
      currentPasswordAuth('@ana:blazeroom.com.br', 'old'),
      'new',
      false
    );
  });
});

describe('changePasswordErrorMessage', () => {
  it('reports a wrong current password', () => {
    expect(changePasswordErrorMessage(new MatrixError({ errcode: 'M_FORBIDDEN' }, 401))).toBe(
      'Current password is incorrect.'
    );
  });

  it("uses the server's message for a weak password", () => {
    const error = new MatrixError({ errcode: 'M_WEAK_PASSWORD', error: 'Too short' }, 400);
    expect(changePasswordErrorMessage(error)).toBe('Too short');
  });

  it('falls back to the error message', () => {
    expect(changePasswordErrorMessage(new Error('Network down'))).toBe('Network down');
  });
});
