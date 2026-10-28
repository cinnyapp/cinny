import { describe, expect, it } from 'vitest';
import { inviteSearchTerm, resolveInviteUserId } from './inviteUserId';

const HS = 'blazeroom.com.br';

describe('resolveInviteUserId', () => {
  it('adds our server to a bare username', () => {
    expect(resolveInviteUserId('ana', HS)).toBe('@ana:blazeroom.com.br');
    expect(resolveInviteUserId('  @Ana ', HS)).toBe('@ana:blazeroom.com.br');
  });

  it('keeps a full user ID as it is', () => {
    expect(resolveInviteUserId('@bob:matrix.org', HS)).toBe('@bob:matrix.org');
  });

  it('rejects input that is not a user ID', () => {
    expect(resolveInviteUserId('', HS)).toBeUndefined();
    expect(resolveInviteUserId('@', HS)).toBeUndefined();
    expect(resolveInviteUserId('ana:', HS)).toBeUndefined();
    expect(resolveInviteUserId('two words', HS)).toBeUndefined();
  });
});

describe('inviteSearchTerm', () => {
  it('strips the "@" and the server', () => {
    expect(inviteSearchTerm('@ana:blazeroom.com.br')).toBe('ana');
    expect(inviteSearchTerm(' an ')).toBe('an');
    expect(inviteSearchTerm('@')).toBe('');
  });
});
