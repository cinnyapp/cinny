const MATRIX_TO_BASE = 'https://matrix.to';

export const getMatrixToUser = (userId: string): string => `${MATRIX_TO_BASE}/#/${userId}`;

const withViaServers = (fragment: string, viaServers: string[]): string =>
  `${fragment}?${viaServers.map((server) => `via=${server}`).join('&')}`;

export const getMatrixToRoom = (roomIdOrAlias: string, viaServers?: string[]): string => {
  let fragment = roomIdOrAlias;

  if (Array.isArray(viaServers) && viaServers.length > 0) {
    fragment = withViaServers(fragment, viaServers);
  }

  return `${MATRIX_TO_BASE}/#/${fragment}`;
};

export const getMatrixToRoomEvent = (
  roomIdOrAlias: string,
  eventId: string,
  viaServers?: string[]
): string => {
  let fragment = `${roomIdOrAlias}/${eventId}`;

  if (Array.isArray(viaServers) && viaServers.length > 0) {
    fragment = withViaServers(fragment, viaServers);
  }

  return `${MATRIX_TO_BASE}/#/${fragment}`;
};

export type MatrixToRoom = {
  roomIdOrAlias: string;
  viaServers?: string[];
};

export type MatrixToRoomEvent = MatrixToRoom & {
  eventId: string;
};

const MATRIX_TO = /^https?:\/\/matrix\.to\S*$/;
export const testMatrixTo = (href: string): boolean => MATRIX_TO.test(href);

const MATRIX_TO_USER = /^https?:\/\/matrix\.to\/#\/(@[^:\s]+:[^?/\s]+)\/?$/;
const MATRIX_TO_ROOM = /^https?:\/\/matrix\.to\/#\/([#!][^:\s]+:[^?/\s]+)\/?(\?[\S]*)?$/;
const MATRIX_TO_ROOM_EVENT =
  /^https?:\/\/matrix\.to\/#\/([#!][^:\s]+:[^?/\s]+)\/(\$[^?/\s]+)\/?(\?[\S]*)?$/;

export const parseMatrixToUser = (href: string): string | undefined => {
  const match = href.match(MATRIX_TO_USER);
  if (!match) return undefined;
  const userId = match[1];
  return userId;
};

export const parseMatrixToRoom = (href: string): MatrixToRoom | undefined => {
  const match = href.match(MATRIX_TO_ROOM);
  if (!match) return undefined;

  const roomIdOrAlias = match[1];
  const viaSearchStr = match[2];
  const viaServers = new URLSearchParams(viaSearchStr).getAll('via');

  return {
    roomIdOrAlias,
    viaServers: viaServers.length === 0 ? undefined : viaServers,
  };
};

export const parseMatrixToRoomEvent = (href: string): MatrixToRoomEvent | undefined => {
  const match = href.match(MATRIX_TO_ROOM_EVENT);
  if (!match) return undefined;

  const roomIdOrAlias = match[1];
  const eventId = match[2];
  const viaSearchStr = match[3];
  const viaServers = new URLSearchParams(viaSearchStr).getAll('via');

  return {
    roomIdOrAlias,
    eventId,
    viaServers: viaServers.length === 0 ? undefined : viaServers,
  };
};
