import { describe, expect, it, vi } from 'vitest';
import {
  AdminApiError,
  adminErrorMessage,
  createAdminApi,
  generatePassword,
  loginDetails,
} from './adminApi';

const respond = (status: number, body?: unknown) =>
  vi
    .fn()
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe('createAdminApi', () => {
  it('asks whether we are a server admin', async () => {
    const fetchImpl = respond(200, { admin: true });
    const api = createAdminApi(() => 'tok', fetchImpl);
    expect(await api.isAdmin()).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('/api/admin/me', {
      method: 'GET',
      headers: { Authorization: 'Bearer tok' },
    });
  });

  it('creates an account and returns its user ID', async () => {
    const fetchImpl = respond(201, { userId: '@bob:blazeroom.com.br' });
    const api = createAdminApi(() => 'tok', fetchImpl);
    const account = { username: 'bob', password: 'longenough', admin: false };

    expect(await api.createAccount(account)).toBe('@bob:blazeroom.com.br');
    const [path, init] = fetchImpl.mock.calls[0];
    expect(path).toBe('/api/admin/users');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(account);
  });

  it('turns error bodies and network failures into AdminApiError', async () => {
    const taken = createAdminApi(() => 'tok', respond(409, { error: 'user_exists' }));
    await expect(
      taken.createAccount({ username: 'a', password: 'b', admin: false })
    ).rejects.toMatchObject({
      code: 'user_exists',
      status: 409,
    });

    const down = createAdminApi(() => 'tok', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(down.isAdmin()).rejects.toMatchObject({ code: 'network', status: 0 });
  });
});

describe('adminErrorMessage', () => {
  it('explains each error', () => {
    expect(adminErrorMessage(new AdminApiError('user_exists', 409))).toBe(
      'That username is already taken.'
    );
    expect(
      adminErrorMessage(new AdminApiError('rejected', 400, 'Numeric user IDs are reserved'))
    ).toBe('Numeric user IDs are reserved');
    expect(adminErrorMessage(new AdminApiError('internal', 500))).toBe(
      "Couldn't create the account (internal)."
    );
    expect(adminErrorMessage(new Error('x'))).toBe('Something went wrong.');
  });
});

describe('generatePassword', () => {
  it('makes passwords of the given length without look-alike characters', () => {
    const password = generatePassword(16);
    expect(password).toHaveLength(16);
    expect(password).not.toMatch(/[0O1lI]/);
    expect(generatePassword(16)).not.toBe(password);
  });
});

describe('loginDetails', () => {
  it('formats what to send to the new user', () => {
    expect(loginDetails('blazeroom.com.br', '@bob:blazeroom.com.br', 'pw')).toBe(
      'Site: https://blazeroom.com.br\nUsername: @bob:blazeroom.com.br\nPassword: pw'
    );
  });
});
