import { ApiError, createApiRequest } from '../../utils/blazeroomApi';

// Matches api/src/adminRoutes.js.
export const MIN_PASSWORD_LENGTH = 8;

export type NewAccount = { username: string; password: string; admin: boolean };

export type AdminRole = { admin: boolean; superadmin: boolean };
export const NO_ADMIN_ROLE: AdminRole = { admin: false, superadmin: false };

export type Role = 'user' | 'admin' | 'superadmin' | 'bot';

// One account as the API lists it, with what we may do to it (decided by the server).
export type ManagedUser = {
  userId: string;
  displayName: string | null;
  role: Role;
  locked: boolean;
  deactivated: boolean;
  createdAt: string | null;
  canEdit: boolean;
  canChangeRole: boolean;
};

// Talks to /api/admin (blazeroom api/), which forwards to Synapse's admin API with our token.
export const createAdminApi = (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) => {
  const request = createApiRequest(getToken, fetchImpl);
  const userPath = (userId: string, action: string) =>
    `/api/admin/users/${encodeURIComponent(userId)}/${action}`;

  return {
    async role(): Promise<AdminRole> {
      const res = await request('/api/admin/me', 'GET');
      const body = (await res.json()) as { admin?: unknown; superadmin?: unknown };
      return { admin: body.admin === true, superadmin: body.superadmin === true };
    },
    async listUsers(): Promise<ManagedUser[]> {
      const res = await request('/api/admin/users', 'GET');
      return ((await res.json()) as { users: ManagedUser[] }).users;
    },
    async resetPassword(userId: string, password: string): Promise<void> {
      await request(userPath(userId, 'password'), 'POST', { password });
    },
    async setLocked(userId: string, locked: boolean): Promise<void> {
      await request(userPath(userId, 'lock'), 'POST', { locked });
    },
    async setAdmin(userId: string, admin: boolean): Promise<void> {
      await request(userPath(userId, 'role'), 'POST', { admin });
    },
    async createAccount(account: NewAccount): Promise<string> {
      const res = await request('/api/admin/users', 'POST', account);
      return ((await res.json()) as { userId: string }).userId;
    },
  };
};

export const adminErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) return 'Something went wrong.';
  switch (error.code) {
    case 'user_exists':
      return 'That username is already taken.';
    case 'invalid_username':
      return 'Usernames can only use a–z, 0–9 and . _ = - / +';
    case 'weak_password':
      return `Password must have at least ${MIN_PASSWORD_LENGTH} characters.`;
    case 'rejected':
      return error.message;
    case 'forbidden':
      return "You don't have permission to do that.";
    case 'no_such_user':
      return "That account doesn't exist.";
    case 'network':
      return "Couldn't reach the server.";
    default:
      return `Something went wrong (${error.code}).`;
  }
};

// No look-alike characters (0/O, 1/l/I), so it can be read out or typed from a phone.
const PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generatePassword = (
  length = 16,
  random: (bytes: Uint32Array) => Uint32Array = (bytes) => crypto.getRandomValues(bytes)
): string =>
  Array.from(
    random(new Uint32Array(length)),
    (n) => PASSWORD_ALPHABET[n % PASSWORD_ALPHABET.length]
  ).join('');

export const loginDetails = (homeserver: string, userId: string, password: string): string =>
  [`Site: https://${homeserver}`, `Username: ${userId}`, `Password: ${password}`].join('\n');

export const ROLE_LABELS: Record<Role, string> = {
  user: 'User',
  admin: 'Admin',
  superadmin: 'Superadmin',
  bot: 'Bot',
};

// Matches the user ID, display name or role label, ignoring case.
export const matchesUserFilter = (user: ManagedUser, filter: string): boolean => {
  const term = filter.trim().toLowerCase();
  if (!term) return true;
  return [user.userId, user.displayName ?? '', ROLE_LABELS[user.role]].some((text) =>
    text.toLowerCase().includes(term)
  );
};
