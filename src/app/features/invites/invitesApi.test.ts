import { describe, expect, it, vi } from 'vitest';
import {
  createInvitesApi,
  expiresInLabel,
  inviteErrorMessage,
  minutesLabel,
  usageLabel,
  usesLabel,
} from './invitesApi';
import { ApiError } from '../../utils/blazeroomApi';

const respond = (status: number, body?: unknown) =>
  vi
    .fn()
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe('createInvitesApi', () => {
  it('reads the info, creates with the chosen options and revokes by code', async () => {
    const info = { perDay: 5, remaining: 5, options: { uses: [1, 5], minutes: [15, 60, 1440] } };
    const infoFetch = respond(200, info);
    expect(await createInvitesApi(() => 'tok', infoFetch).info()).toEqual(info);
    expect(infoFetch).toHaveBeenCalledWith('/api/invites', {
      method: 'GET',
      headers: { Authorization: 'Bearer tok' },
    });

    const createFetch = respond(201, { token: 'abc' });
    await createInvitesApi(() => 'tok', createFetch).create({ uses: 5, minutes: 1440 });
    const [path, init] = createFetch.mock.calls[0];
    expect([path, init.method, JSON.parse(init.body)]).toEqual([
      '/api/invites',
      'POST',
      { uses: 5, minutes: 1440 },
    ]);

    const revokeFetch = respond(204);
    await createInvitesApi(() => 'tok', revokeFetch).revoke('abc');
    expect(revokeFetch.mock.calls[0][0]).toBe('/api/invites/abc');
    expect(revokeFetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('reports the daily limit', async () => {
    const api = createInvitesApi(() => 'tok', respond(429, { error: 'daily_limit' }));
    await expect(api.create({ uses: 5, minutes: 60 })).rejects.toMatchObject({
      code: 'daily_limit',
    });
  });
});

describe('labels', () => {
  it('names the options', () => {
    expect([1, 5, null].map(usesLabel)).toEqual(['1 person', '5 people', 'No limit']);
    expect([15, 30, 60, 1440, 10080, 43200].map(minutesLabel)).toEqual([
      '15 minutes',
      '30 minutes',
      '1 hour',
      '1 day',
      '7 days',
      '30 days',
    ]);
  });

  it('says how long a link has left', () => {
    const now = Date.parse('2026-10-28T12:00:00Z');
    const at = (ms: number) => new Date(now + ms).toISOString();
    expect(expiresInLabel(at(10_000), now)).toBe('expires in 1 min');
    expect(expiresInLabel(at(45 * 60_000), now)).toBe('expires in 45 min');
    expect(expiresInLabel(at(60 * 60_000), now)).toBe('expires in 1 hour');
    expect(expiresInLabel(at(23 * 3_600_000), now)).toBe('expires in 23 hours');
    expect(expiresInLabel(at(7 * 86_400_000), now)).toBe('expires in 7 days');
  });

  it('says how many joined', () => {
    expect(usageLabel({ used: 0, usesAllowed: 1 })).toBe('0 of 1 joined');
    expect(usageLabel({ used: 2, usesAllowed: 5 })).toBe('2 of 5 joined');
    expect(usageLabel({ used: 5, usesAllowed: 5 })).toBe('Used up');
    expect(usageLabel({ used: 7, usesAllowed: null })).toBe('7 joined');
  });

  it('explains errors', () => {
    expect(inviteErrorMessage(new ApiError('daily_limit', 429))).toBe(
      "That's more people than you have left today."
    );
    expect(inviteErrorMessage(new ApiError('network', 0))).toBe("Couldn't reach the server.");
    expect(inviteErrorMessage(new Error('x'))).toBe('Something went wrong. Try again in a moment.');
  });
});
