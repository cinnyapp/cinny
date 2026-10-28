import { ApiError, createApiRequest } from '../../utils/blazeroomApi';

// `uses: null` means no limit (admins only).
export type InviteChoice = { uses: number | null; minutes: number };

export type Invite = {
  token: string;
  link: string;
  usesAllowed: number | null;
  used: number;
  createdAt: string;
  expiresAt: string;
};

// What GET /api/invites returns. perDay and remaining are null for admins (no limit).
export type InvitesInfo = {
  perDay: number | null;
  remaining: number | null;
  options: { uses: (number | null)[]; minutes: number[] };
  defaults: InviteChoice;
  invites: Invite[];
};

export type CreatedInvite = Invite & { remaining: number | null };

// Sign-up links for people who aren't on blazeroom yet (api/src/inviteRoutes.js).
export const createInvitesApi = (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) => {
  const request = createApiRequest(getToken, fetchImpl);

  return {
    async info(): Promise<InvitesInfo> {
      const res = await request('/api/invites', 'GET');
      return (await res.json()) as InvitesInfo;
    },
    async create(choice: InviteChoice): Promise<CreatedInvite> {
      const res = await request('/api/invites', 'POST', choice);
      return (await res.json()) as CreatedInvite;
    },
    async revoke(token: string): Promise<void> {
      await request(`/api/invites/${encodeURIComponent(token)}`, 'DELETE');
    },
  };
};

export const inviteErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.code === 'daily_limit') return "That's more people than you have left today.";
    if (error.code === 'invalid_option') return "That option isn't available to you.";
    if (error.code === 'no_such_invite') return 'That link was already revoked.';
    if (error.code === 'network') return "Couldn't reach the server.";
  }
  return 'Something went wrong. Try again in a moment.';
};

export const usesLabel = (uses: number | null): string => {
  if (uses === null) return 'No limit';
  return uses === 1 ? '1 person' : `${uses} people`;
};

export const minutesLabel = (minutes: number): string => {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour' : `${hours} hours`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
};

// "expires in 3 hours", "expires in 2 days"; under a minute counts as a minute.
export const expiresInLabel = (expiresAt: string, now = Date.now()): string => {
  const minutes = Math.max(1, Math.round((Date.parse(expiresAt) - now) / 60_000));
  if (minutes < 60) return `expires in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `expires in ${hours === 1 ? '1 hour' : `${hours} hours`}`;
  return `expires in ${Math.round(hours / 24)} days`;
};

export const usageLabel = ({ used, usesAllowed }: Pick<Invite, 'used' | 'usesAllowed'>): string => {
  if (usesAllowed === null) return `${used} joined`;
  if (used >= usesAllowed) return 'Used up';
  return `${used} of ${usesAllowed} joined`;
};

export const inviteShareText = (
  invite: Pick<Invite, 'link' | 'usesAllowed' | 'expiresAt'>
): string => {
  const who = invite.usesAllowed === 1 ? 'It works once' : 'It works for a group';
  const until = new Date(invite.expiresAt).toLocaleString();
  return `Join me on blazeroom: ${invite.link}\n${who} and expires ${until}.`;
};
