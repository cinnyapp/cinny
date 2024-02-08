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

export const RESET_PASSWORD_PATH = '/reset-password/:server?/';

export const _CREATE_PATH = 'create/';
export const _JOIN_PATH = 'join/';
export const _LOBBY_PATH = 'lobby/';
export const _SEARCH_PATH = 'search/';
export const _ROOM_PATH = ':roomIdOrAlias/:eventId?/';

export const HOME_PATH = '/home/';
export const HOME_CREATE_PATH = `/home/${_CREATE_PATH}`;
export const HOME_JOIN_PATH = `/home/${_JOIN_PATH}`;
export const HOME_SEARCH_PATH = `/home/${_SEARCH_PATH}`;
export const HOME_ROOM_PATH = `/home/${_ROOM_PATH}`;

export const DIRECT_PATH = '/direct/';
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
export const EXPLORE_SERVER_PATH = `/explore/${_SERVER_PATH}`;

export const _MESSAGES_PATH = 'messages/';
export const _INVITES_PATH = 'invites/';
export const NOTIFICATIONS_PATH = '/notifications/';
export const NOTIFICATIONS_MESSAGES_PATH = `/notifications/${_MESSAGES_PATH}`;
export const NOTIFICATIONS_INVITES_PATH = `/notifications/${_INVITES_PATH}`;

export const USER_SETTINGS_PATH = '/user-settings/';

export const SPACE_SETTINGS_PATH = '/space-settings/';

export const ROOM_SETTINGS_PATH = '/room-settings/';
