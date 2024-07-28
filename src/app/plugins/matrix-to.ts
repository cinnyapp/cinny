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
