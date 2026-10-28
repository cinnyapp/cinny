import { ApiError, createApiRequest } from '../../utils/blazeroomApi';

// Matches api/src/app.js.
export const MIN_PASSWORD_LENGTH = 8;

export type NewAccount = { username: string; password: string; admin: boolean };

// Talks to /api/admin (blazeroom api/), which forwards to Synapse's admin API with our token.
export const createAdminApi = (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) => {
  const request = createApiRequest(getToken, fetchImpl);

  return {
    async isAdmin(): Promise<boolean> {
      const res = await request('/api/admin/me', 'GET');
      return ((await res.json()) as { admin?: unknown }).admin === true;
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
      return 'Only server admins can create accounts.';
    case 'network':
      return "Couldn't reach the server.";
    default:
      return `Couldn't create the account (${error.code}).`;
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
