import { describe, expect, it, vi } from 'vitest';
import { createInvitesApi, inviteErrorMessage, inviteShareText } from './invitesApi';
import { ApiError } from '../../utils/blazeroomApi';

const respond = (status: number, body?: unknown) =>
  vi
    .fn()
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe('createInvitesApi', () => {
  it('reads the quota and creates an invite with our token', async () => {
    const quota = { remaining: 5, perDay: 5, days: 7 };
    const quotaFetch = respond(200, quota);
    expect(await createInvitesApi(() => 'tok', quotaFetch).quota()).toEqual(quota);
    expect(quotaFetch).toHaveBeenCalledWith('/api/invites', {
      method: 'GET',
      headers: { Authorization: 'Bearer tok' },
    });

    const invite = {
      token: 'abc',
      link: 'https://blazeroom.com.br/register?token=abc',
      expiresAt: '2026-11-04T12:00:00.000Z',
      remaining: 4,
    };
    const createFetch = respond(201, invite);
    expect(await createInvitesApi(() => 'tok', createFetch).create()).toEqual(invite);
    expect(createFetch.mock.calls[0][1].method).toBe('POST');
  });

  it('reports the daily limit', async () => {
    const api = createInvitesApi(() => 'tok', respond(429, { error: 'daily_limit' }));
    await expect(api.create()).rejects.toMatchObject({ code: 'daily_limit', status: 429 });
  });
});

describe('inviteErrorMessage', () => {
  it('explains the limit and network errors', () => {
    expect(inviteErrorMessage(new ApiError('daily_limit', 429))).toBe(
      "You've used all your invites for today."
    );
    expect(inviteErrorMessage(new ApiError('network', 0))).toBe("Couldn't reach the server.");
    expect(inviteErrorMessage(new ApiError('homeserver_unavailable', 502))).toBe(
      "Couldn't create the invite. Try again in a moment."
    );
  });
});

describe('inviteShareText', () => {
  it('includes the link and how long it lasts', () => {
    expect(inviteShareText('https://x/register?token=a', 7)).toBe(
      'Join me on blazeroom: https://x/register?token=a\nThe link works once and expires in 7 days.'
    );
  });
});
