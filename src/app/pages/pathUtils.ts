import { generatePath } from 'react-router-dom';
import {
  DIRECT_CREATE_PATH,
  DIRECT_PATH,
  DIRECT_ROOM_PATH,
  EXPLORE_FEATURED_PATH,
  EXPLORE_PATH,
  EXPLORE_SERVER_PATH,
  HOME_CREATE_PATH,
  HOME_JOIN_PATH,
  HOME_PATH,
  HOME_ROOM_PATH,
  HOME_SEARCH_PATH,
  LOGIN_PATH,
  NOTIFICATIONS_INVITES_PATH,
  NOTIFICATIONS_MESSAGES_PATH,
  NOTIFICATIONS_PATH,
  REGISTER_PATH,
  RESET_PASSWORD_PATH,
  ROOT_PATH,
  SPACE_LOBBY_PATH,
  SPACE_PATH,
  SPACE_ROOM_PATH,
  SPACE_SEARCH_PATH,
} from './paths';

export const withSearchParam = <T extends Record<string, string>>(
  path: string,
  searchParam: T
): string => {
  const params = new URLSearchParams(searchParam);

  return `${path}?${params}`;
};

export const getRootPath = (): string => ROOT_PATH;

export const getLoginPath = (server?: string): string => {
  const params = server ? { server: encodeURIComponent(server) } : undefined;
  return generatePath(LOGIN_PATH, params);
};

export const getRegisterPath = (server?: string): string => {
  const params = server ? { server: encodeURIComponent(server) } : undefined;
  return generatePath(REGISTER_PATH, params);
};

export const getResetPasswordPath = (server?: string): string => {
  const params = server ? { server: encodeURIComponent(server) } : undefined;
  return generatePath(RESET_PASSWORD_PATH, params);
};

export const getHomePath = (): string => HOME_PATH;
export const getHomeCreatePath = (): string => HOME_CREATE_PATH;
export const getHomeJoinPath = (): string => HOME_JOIN_PATH;
export const getHomeSearchPath = (): string => HOME_SEARCH_PATH;
export const getHomeRoomPath = (roomIdOrAlias: string, eventId?: string): string => {
  const params = {
    roomIdOrAlias: encodeURIComponent(roomIdOrAlias),
    eventId: eventId ? encodeURIComponent(eventId) : null,
  };

  return generatePath(HOME_ROOM_PATH, params);
};

export const getDirectPath = (): string => DIRECT_PATH;
export const getDirectCreatePath = (): string => DIRECT_CREATE_PATH;
export const getDirectRoomPath = (roomIdOrAlias: string, eventId?: string): string => {
  const params = {
    roomIdOrAlias: encodeURIComponent(roomIdOrAlias),
    eventId: eventId ? encodeURIComponent(eventId) : null,
  };

  return generatePath(DIRECT_ROOM_PATH, params);
};

export const getSpacePath = (spaceIdOrAlias: string): string => {
  const params = {
    spaceIdOrAlias: encodeURIComponent(spaceIdOrAlias),
  };

  return generatePath(SPACE_PATH, params);
};
export const getSpaceLobbyPath = (spaceIdOrAlias: string): string => {
  const params = {
    spaceIdOrAlias: encodeURIComponent(spaceIdOrAlias),
  };
  return generatePath(SPACE_LOBBY_PATH, params);
};
export const getSpaceSearchPath = (spaceIdOrAlias: string): string => {
  const params = {
    spaceIdOrAlias: encodeURIComponent(spaceIdOrAlias),
  };
  return generatePath(SPACE_SEARCH_PATH, params);
};
export const getSpaceRoomPath = (
  spaceIdOrAlias: string,
  roomIdOrAlias: string,
  eventId?: string
): string => {
  const params = {
    spaceIdOrAlias: encodeURIComponent(spaceIdOrAlias),
    roomIdOrAlias: encodeURIComponent(roomIdOrAlias),
    eventId: eventId ? encodeURIComponent(eventId) : null,
  };

  return generatePath(SPACE_ROOM_PATH, params);
};

export const getExplorePath = (): string => EXPLORE_PATH;
export const getExploreFeaturedPath = (): string => EXPLORE_FEATURED_PATH;
export const getExploreServerPath = (server: string): string => {
  const params = {
    server,
  };
  return generatePath(EXPLORE_SERVER_PATH, params);
};

export const getNotificationsPath = (): string => NOTIFICATIONS_PATH;
export const getNotificationsMessagesPath = (): string => NOTIFICATIONS_MESSAGES_PATH;
export const getNotificationsInvitesPath = (): string => NOTIFICATIONS_INVITES_PATH;
