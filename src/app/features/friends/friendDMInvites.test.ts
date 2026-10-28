import { describe, expect, it } from 'vitest';
import { friendDMInvitesToAccept, InviteInfo } from './friendDMInvites';

const friends = new Set(['@kist:blazeroom.com.br']);

describe('friendDMInvitesToAccept', () => {
  it('accepts a DM invite sent by a friend', () => {
    const invites: InviteInfo[] = [
      { roomId: '!dm', isDirect: true, inviter: '@kist:blazeroom.com.br' },
    ];
    expect(friendDMInvitesToAccept(invites, friends, new Set())).toEqual([
      { roomId: '!dm', inviter: '@kist:blazeroom.com.br' },
    ]);
  });

  it('skips a DM invite from someone who is not a friend', () => {
    const invites: InviteInfo[] = [
      { roomId: '!dm', isDirect: true, inviter: '@stranger:blazeroom.com.br' },
    ];
    expect(friendDMInvitesToAccept(invites, friends, new Set())).toEqual([]);
  });

  it('skips a group or space invite from a friend', () => {
    const invites: InviteInfo[] = [
      { roomId: '!group', isDirect: false, inviter: '@kist:blazeroom.com.br' },
    ];
    expect(friendDMInvitesToAccept(invites, friends, new Set())).toEqual([]);
  });

  it('skips an invite whose inviter is unknown', () => {
    const invites: InviteInfo[] = [{ roomId: '!dm', isDirect: true }];
    expect(friendDMInvitesToAccept(invites, friends, new Set())).toEqual([]);
  });

  it('skips a room it already tried to join', () => {
    const invites: InviteInfo[] = [
      { roomId: '!dm', isDirect: true, inviter: '@kist:blazeroom.com.br' },
    ];
    expect(friendDMInvitesToAccept(invites, friends, new Set(['!dm']))).toEqual([]);
  });

  it('skips a DM from a pending (not yet accepted) friend', () => {
    // Only accepted friends are passed in; a pending request's user is absent from the set.
    const invites: InviteInfo[] = [
      { roomId: '!dm', isDirect: true, inviter: '@pending:blazeroom.com.br' },
    ];
    expect(friendDMInvitesToAccept(invites, friends, new Set())).toEqual([]);
  });
});
