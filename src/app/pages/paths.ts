export const ROOT_PATH = '/';

export type LoginPathSearchParams = {
  username?: string;
  email?: string;
  loginToken?: string;
};
export const LOGIN_PATH = '/login/:server?/';

export type RegisterPathSearchParams = {
  username?: string;
  email?: string;
  token?: string;
};
export const REGISTER_PATH = '/register/:server?/';

export type ResetPasswordPathSearchParams = {
  email?: string;
};
export const RESET_PASSWORD_PATH = '/reset-password/:server?/';

export const _CREATE_PATH = 'create/';
export const _JOIN_PATH = 'join/';
export const _LOBBY_PATH = 'lobby/';
/**
 * array of rooms and senders mxId assigned
 * to search param as string should be "," separated
 * Like: url?rooms=!one:server,!two:server
 */
export type _SearchPathSearchParams = {
  global?: string;
  term?: string;
  order?: string;
  rooms?: string;
  senders?: string;
};
export const _SEARCH_PATH = 'search/';

export type _RoomSearchParams = {
  /* comma separated string of servers */
  viaServers?: string;
};
export const _ROOM_PATH = ':roomIdOrAlias/:eventId?/';

export const HOME_PATH = '/home/';
export const HOME_CREATE_PATH = `/home/${_CREATE_PATH}`;
export const HOME_JOIN_PATH = `/home/${_JOIN_PATH}`;
export const HOME_SEARCH_PATH = `/home/${_SEARCH_PATH}`;
export const HOME_ROOM_PATH = `/home/${_ROOM_PATH}`;

export const DIRECT_PATH = '/direct/';
export type DirectCreateSearchParams = {
  userId?: string;
};
export const DIRECT_CREATE_PATH = `/direct/${_CREATE_PATH}`;
export const DIRECT_ROOM_PATH = `/direct/${_ROOM_PATH}`;

export const SPACE_PATH = '/:spaceIdOrAlias/';
export const SPACE_LOBBY_PATH = `/:spaceIdOrAlias/${_LOBBY_PATH}`;
export const SPACE_SEARCH_PATH = `/:spaceIdOrAlias/${_SEARCH_PATH}`;
export const SPACE_ROOM_PATH = `/:spaceIdOrAlias/${_ROOM_PATH}`;

export const _FEATURED_PATH = 'featured/';
export const _SERVER_PATH = ':server/';
export const EXPLORE_PATH = '/explore/';
export const EXPLORE_FEATURED_PATH = `/explore/${_FEATURED_PATH}`;

export type ExploreServerPathSearchParams = {
  limit?: string;
  since?: string;
  term?: string;
  type?: string;
  instance?: string;
};
export const EXPLORE_SERVER_PATH = `/explore/${_SERVER_PATH}`;

export const _NOTIFICATIONS_PATH = 'notifications/';
export const _INVITES_PATH = 'invites/';
export const INBOX_PATH = '/inbox/';
export type InboxNotificationsPathSearchParams = {
  only?: string;
};
export const INBOX_NOTIFICATIONS_PATH = `/inbox/${_NOTIFICATIONS_PATH}`;
export const INBOX_INVITES_PATH = `/inbox/${_INVITES_PATH}`;

export const SPACE_SETTINGS_PATH = '/space-settings/';

export const ROOM_SETTINGS_PATH = '/room-settings/';
