import { ApiError, createApiRequest } from '../../utils/blazeroomApi';

export type InviteQuota = { remaining: number; perDay: number; days: number };
export type Invite = { token: string; link: string; expiresAt: string; remaining: number };

// Sign-up links for people who aren't on blazeroom yet (api/src/invites.js).
export const createInvitesApi = (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) => {
  const request = createApiRequest(getToken, fetchImpl);

  return {
    async quota(): Promise<InviteQuota> {
      const res = await request('/api/invites', 'GET');
      return (await res.json()) as InviteQuota;
    },
    async create(): Promise<Invite> {
      const res = await request('/api/invites', 'POST');
      return (await res.json()) as Invite;
    },
  };
};

export const inviteErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.code === 'daily_limit') return "You've used all your invites for today.";
    if (error.code === 'network') return "Couldn't reach the server.";
  }
  return "Couldn't create the invite. Try again in a moment.";
};

export const inviteShareText = (link: string, days: number): string =>
  `Join me on blazeroom: ${link}\nThe link works once and expires in ${days} days.`;
