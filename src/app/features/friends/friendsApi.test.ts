import { describe, expect, it } from 'vitest';
import { createFriendsApi, expandUserId, FriendsApiError } from './friendsApi';

type Call = { url: string; init: RequestInit };

const stub = (res: Response | (() => Response)) => {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return typeof res === 'function' ? res() : res;
  }) as unknown as typeof fetch;
  return { calls, api: createFriendsApi(() => 'tok', fetchImpl) };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const headerKeys = (init: RequestInit) =>
  Object.keys((init.headers ?? {}) as Record<string, string>).map((k) => k.toLowerCase());

describe('expandUserId', () => {
  it('expands bare names, trimming and lowercasing', () => {
    expect(expandUserId('  Kist ', 'blazeroom.com.br')).toBe('@kist:blazeroom.com.br');
  });
  it('passes full ids through lowercased', () => {
    expect(expandUserId(' @Kist:Other.org ', 'blazeroom.com.br')).toBe('@kist:other.org');
  });
});

describe('friends api', () => {
  it('list sends an authorized GET without content-type', async () => {
    const body = { friends: [], incoming: [], outgoing: [] };
    const { calls, api } = stub(json(body));
    expect(await api.list()).toEqual(body);
    expect(calls[0].url).toBe('/api/friends');
    expect(calls[0].init.method ?? 'GET').toBe('GET');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(headerKeys(calls[0].init)).not.toContain('content-type');
  });

  it('sendRequest posts JSON and maps 201 to pending', async () => {
    const { calls, api } = stub(json({ status: 'pending' }, 201));
    expect(await api.sendRequest('@b:x')).toBe('pending');
    expect(calls[0].url).toBe('/api/friends/requests');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.body).toBe(JSON.stringify({ userId: '@b:x' }));
    expect(headerKeys(calls[0].init)).toContain('content-type');
  });

  it('sendRequest maps 200 accepted', async () => {
    const { api } = stub(json({ status: 'accepted' }, 200));
    expect(await api.sendRequest('@b:x')).toBe('accepted');
  });

  it('rejects with the error code and status', async () => {
    const { api } = stub(json({ error: 'already_friends' }, 409));
    const err = await api.sendRequest('@b:x').catch((e) => e);
    expect(err).toBeInstanceOf(FriendsApiError);
    expect(err.code).toBe('already_friends');
    expect(err.status).toBe(409);
  });

  it('maps 502 to homeserver_unavailable', async () => {
    const { api } = stub(json({ error: 'homeserver_unavailable' }, 502));
    const err = await api.list().catch((e) => e);
    expect(err.code).toBe('homeserver_unavailable');
    expect(err.status).toBe(502);
  });

  it('uses unknown for non-JSON error bodies', async () => {
    const { api } = stub(new Response('<html>', { status: 500 }));
    const err = await api.list().catch((e) => e);
    expect(err).toBeInstanceOf(FriendsApiError);
    expect(err.code).toBe('unknown');
    expect(err.status).toBe(500);
  });

  it('maps thrown fetch to network', async () => {
    const api = createFriendsApi(() => 'tok', (async () => {
      throw new TypeError('fail');
    }) as unknown as typeof fetch);
    const err = await api.list().catch((e) => e);
    expect(err).toBeInstanceOf(FriendsApiError);
    expect(err.code).toBe('network');
    expect(err.status).toBe(0);
  });

  it('accept posts to the encoded path without body or content-type', async () => {
    const { calls, api } = stub(json({ status: 'accepted' }));
    await api.accept('@a:x');
    expect(calls[0].url).toBe('/api/friends/requests/%40a%3Ax/accept');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.body).toBeUndefined();
    expect(headerKeys(calls[0].init)).not.toContain('content-type');
  });

  it('remove sends DELETE and resolves on 204', async () => {
    const { calls, api } = stub(new Response(null, { status: 204 }));
    await expect(api.remove('@a:x')).resolves.toBeUndefined();
    expect(calls[0].url).toBe('/api/friends/requests/%40a%3Ax');
    expect(calls[0].init.method).toBe('DELETE');
    expect(headerKeys(calls[0].init)).not.toContain('content-type');
  });
});
