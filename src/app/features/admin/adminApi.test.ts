import { describe, expect, it, vi } from 'vitest';
import {
  adminErrorMessage,
  createAdminApi,
  generatePassword,
  loginDetails,
  matchesUserFilter,
} from './adminApi';
import { ApiError } from '../../utils/blazeroomApi';

const respond = (status: number, body?: unknown) =>
  vi
    .fn()
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe('createAdminApi', () => {
  it('asks for our admin role', async () => {
    const fetchImpl = respond(200, { admin: true, superadmin: false });
    const api = createAdminApi(() => 'tok', fetchImpl);
    expect(await api.role()).toEqual({ admin: true, superadmin: false });
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

  it('turns error bodies and network failures into ApiError', async () => {
    const taken = createAdminApi(() => 'tok', respond(409, { error: 'user_exists' }));
    await expect(
      taken.createAccount({ username: 'a', password: 'b', admin: false })
    ).rejects.toMatchObject({
      code: 'user_exists',
      status: 409,
    });

    const down = createAdminApi(() => 'tok', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(down.role()).rejects.toMatchObject({ code: 'network', status: 0 });
  });
});

describe('user management', () => {
  it('lists users and posts edits to the user ID, encoded', async () => {
    const users = [{ userId: '@ana:x', role: 'user' }];
    const list = respond(200, { users });
    expect(await createAdminApi(() => 'tok', list).listUsers()).toEqual(users);
    expect(list.mock.calls[0][0]).toBe('/api/admin/users');

    const edit = vi.fn().mockImplementation(async () => new Response('{}', { status: 200 }));
    const api = createAdminApi(() => 'tok', edit);
    await api.resetPassword('@ana:x', 'newpassword');
    await api.setLocked('@ana:x', true);
    await api.setAdmin('@ana:x', false);
    const sent = edit.mock.calls.map(([path, init]) => [path, JSON.parse(init.body)]);
    expect(sent).toEqual([
      ['/api/admin/users/%40ana%3Ax/password', { password: 'newpassword' }],
      ['/api/admin/users/%40ana%3Ax/lock', { locked: true }],
      ['/api/admin/users/%40ana%3Ax/role', { admin: false }],
    ]);
  });
});

describe('matchesUserFilter', () => {
  const user = {
    userId: '@ana:blazeroom.com.br',
    displayName: 'Ana Maria',
    role: 'superadmin' as const,
    locked: false,
    deactivated: false,
    createdAt: null,
    canEdit: false,
    canChangeRole: false,
  };

  it('matches the ID, display name or role, ignoring case', () => {
    expect(matchesUserFilter(user, '')).toBe(true);
    expect(matchesUserFilter(user, 'ANA:')).toBe(true);
    expect(matchesUserFilter(user, 'maria')).toBe(true);
    expect(matchesUserFilter(user, 'superadmin')).toBe(true);
    expect(matchesUserFilter(user, 'bob')).toBe(false);
  });
});

describe('adminErrorMessage', () => {
  it('explains each error', () => {
    expect(adminErrorMessage(new ApiError('user_exists', 409))).toBe(
      'That username is already taken.'
    );
    expect(adminErrorMessage(new ApiError('rejected', 400, 'Numeric user IDs are reserved'))).toBe(
      'Numeric user IDs are reserved'
    );
    expect(adminErrorMessage(new ApiError('internal', 500))).toBe(
      'Something went wrong (internal).'
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
