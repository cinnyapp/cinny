export type FriendsList = {
  friends: { userId: string; since: string }[];
  incoming: { userId: string; at: string }[];
  outgoing: { userId: string; at: string }[];
};

export class FriendsApiError extends Error {
  code: string;

  status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = 'FriendsApiError';
    this.code = code;
    this.status = status;
  }
}

export const expandUserId = (input: string, domain: string): string => {
  const id = input.trim().toLowerCase();
  return id.startsWith('@') ? id : `@${id}:${domain}`;
};

const errorFromResponse = async (res: Response): Promise<FriendsApiError> => {
  let code = 'unknown';
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') code = body.error;
  } catch {
    // non-JSON or empty error body
  }
  return new FriendsApiError(code, res.status);
};

export const createFriendsApi = (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) => {
  const request = async (path: string, method: string, jsonBody?: unknown): Promise<Response> => {
    const headers: Record<string, string> = { Authorization: `Bearer ${getToken() ?? ''}` };
    const init: RequestInit = { method, headers };
    if (jsonBody !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(jsonBody);
    }
    let res: Response;
    try {
      res = await fetchImpl(path, init);
    } catch {
      throw new FriendsApiError('network', 0);
    }
    if (!res.ok) throw await errorFromResponse(res);
    return res;
  };

  const requestPath = (userId: string) => `/api/friends/requests/${encodeURIComponent(userId)}`;

  return {
    async list(): Promise<FriendsList> {
      const res = await request('/api/friends', 'GET');
      return (await res.json()) as FriendsList;
    },
    async sendRequest(userId: string): Promise<'pending' | 'accepted'> {
      const res = await request('/api/friends/requests', 'POST', { userId });
      return res.status === 201 ? 'pending' : 'accepted';
    },
    async accept(userId: string): Promise<void> {
      await request(`${requestPath(userId)}/accept`, 'POST');
    },
    async remove(userId: string): Promise<void> {
      await request(requestPath(userId), 'DELETE');
    },
  };
};

export type FriendsApi = ReturnType<typeof createFriendsApi>;
