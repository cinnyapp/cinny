import { isUserId } from '../../utils/matrix';

// Accepts "ana", "@ana" or a full "@ana:server" and returns the full user ID, or undefined if
// the input can't be one. A name without a server belongs to our own homeserver.
export const resolveInviteUserId = (input: string, homeserver: string): string | undefined => {
  const value = input.trim();
  if (!value) return undefined;
  if (value.includes(':')) return isUserId(value) ? value : undefined;

  const localpart = value.startsWith('@') ? value.slice(1) : value;
  const userId = `@${localpart.toLowerCase()}:${homeserver}`;
  return localpart && isUserId(userId) ? userId : undefined;
};

// Search term for the suggestions: the name without "@" or the server.
export const inviteSearchTerm = (input: string): string => {
  const value = input.trim();
  const name = value.startsWith('@') ? value.slice(1) : value;
  return name.split(':')[0];
};
