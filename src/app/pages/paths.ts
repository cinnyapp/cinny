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

export const HOME_PATH = '/home/';
export const DIRECT_PATH = '/direct/';
export const NOTIFICATIONS_PATH = '/notifications/';
export const SPACE_PATH = '/:spaceIdOrAlias/';
export const EXPLORE_PATH = '/explore/';

export const _CREATE_PATH = './create/';
export const _LOBBY_PATH = './lobby/';
export const _SEARCH_PATH = './search/';
export const _ROOM_PATH = './:roomIdOrAlias/:eventId?/';
