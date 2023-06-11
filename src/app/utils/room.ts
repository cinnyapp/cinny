import { IconName, IconSrc } from 'folds';

import {
  IPushRule,
  IPushRules,
  JoinRule,
  MatrixClient,
  MatrixEvent,
  NotificationCountType,
  Room,
} from 'matrix-js-sdk';
import { AccountDataEvent } from '../../types/matrix/accountData';
import {
  NotificationType,
  RoomToParents,
  RoomType,
  StateEvent,
  UnreadInfo,
} from '../../types/matrix/room';

export const getStateEvent = (
  room: Room,
  eventType: StateEvent,
  stateKey = ''
): MatrixEvent | undefined => room.currentState.getStateEvents(eventType, stateKey) ?? undefined;

export const getStateEvents = (room: Room, eventType: StateEvent): MatrixEvent[] =>
  room.currentState.getStateEvents(eventType);

export const getAccountData = (
  mx: MatrixClient,
  eventType: AccountDataEvent
): MatrixEvent | undefined => mx.getAccountData(eventType);

export const getMDirects = (mDirectEvent: MatrixEvent): Set<string> => {
  const roomIds = new Set<string>();
  const userIdToDirects = mDirectEvent?.getContent();

  if (userIdToDirects === undefined) return roomIds;

  Object.keys(userIdToDirects).forEach((userId) => {
    const directs = userIdToDirects[userId];
    if (Array.isArray(directs)) {
      directs.forEach((id) => {
        if (typeof id === 'string') roomIds.add(id);
      });
    }
  });

  return roomIds;
};

export const isDirectInvite = (room: Room | null, myUserId: string | null): boolean => {
  if (!room || !myUserId) return false;
  const me = room.getMember(myUserId);
  const memberEvent = me?.events?.member;
  const content = memberEvent?.getContent();
  return content?.is_direct === true;
};

export const isSpace = (room: Room | null): boolean => {
  if (!room) return false;
  const event = getStateEvent(room, StateEvent.RoomCreate);
  if (!event) return false;
  return event.getContent().type === RoomType.Space;
};

export const isRoom = (room: Room | null): boolean => {
  if (!room) return false;
  const event = getStateEvent(room, StateEvent.RoomCreate);
  if (!event) return false;
  return event.getContent().type === undefined;
};

export const isUnsupportedRoom = (room: Room | null): boolean => {
  if (!room) return false;
  const event = getStateEvent(room, StateEvent.RoomCreate);
  if (!event) return true; // Consider room unsupported if m.room.create event doesn't exist
  return event.getContent().type !== undefined && event.getContent().type !== RoomType.Space;
};

export function isValidChild(mEvent: MatrixEvent): boolean {
  return mEvent.getType() === StateEvent.SpaceChild && Object.keys(mEvent.getContent()).length > 0;
}

export const getAllParents = (roomToParents: RoomToParents, roomId: string): Set<string> => {
  const allParents = new Set<string>();

  const addAllParentIds = (rId: string) => {
    if (allParents.has(rId)) return;
    allParents.add(rId);

    const parents = roomToParents.get(rId);
    parents?.forEach((id) => addAllParentIds(id));
  };
  addAllParentIds(roomId);
  allParents.delete(roomId);
  return allParents;
};

export const getSpaceChildren = (room: Room) =>
  getStateEvents(room, StateEvent.SpaceChild).reduce<string[]>((filtered, mEvent) => {
    const stateKey = mEvent.getStateKey();
    if (isValidChild(mEvent) && stateKey) {
      filtered.push(stateKey);
    }
    return filtered;
  }, []);

export const mapParentWithChildren = (
  roomToParents: RoomToParents,
  roomId: string,
  children: string[]
) => {
  const allParents = getAllParents(roomToParents, roomId);
  children.forEach((childId) => {
    if (allParents.has(childId)) {
      // Space cycle detected.
      return;
    }
    const parents = roomToParents.get(childId) ?? new Set<string>();
    parents.add(roomId);
    roomToParents.set(childId, parents);
  });
};

export const getRoomToParents = (mx: MatrixClient): RoomToParents => {
  const map: RoomToParents = new Map();
  mx.getRooms()
    .filter((room) => isSpace(room))
    .forEach((room) => mapParentWithChildren(map, room.roomId, getSpaceChildren(room)));

  return map;
};

export const isMutedRule = (rule: IPushRule) =>
  rule.actions[0] === 'dont_notify' && rule.conditions?.[0]?.kind === 'event_match';

export const findMutedRule = (overrideRules: IPushRule[], roomId: string) =>
  overrideRules.find((rule) => rule.rule_id === roomId && isMutedRule(rule));

export const getNotificationType = (mx: MatrixClient, roomId: string): NotificationType => {
  let roomPushRule: IPushRule | undefined;
  try {
    roomPushRule = mx.getRoomPushRule('global', roomId);
  } catch {
    roomPushRule = undefined;
  }

  if (!roomPushRule) {
    const overrideRules = mx.getAccountData('m.push_rules')?.getContent<IPushRules>()
      ?.global?.override;
    if (!overrideRules) return NotificationType.Default;

    return findMutedRule(overrideRules, roomId) ? NotificationType.Mute : NotificationType.Default;
  }

  if (roomPushRule.actions[0] === 'notify') return NotificationType.AllMessages;
  return NotificationType.MentionsAndKeywords;
};

export const isNotificationEvent = (mEvent: MatrixEvent) => {
  const eType = mEvent.getType();
  if (
    ['m.room.create', 'm.room.message', 'm.room.encrypted', 'm.room.member', 'm.sticker'].find(
      (type) => type === eType
    )
  )
    return false;
  if (eType === 'm.room.member') return false;

  if (mEvent.isRedacted()) return false;
  if (mEvent.getRelation()?.rel_type === 'm.replace') return false;

  return true;
};

export const roomHaveUnread = (mx: MatrixClient, room: Room) => {
  const userId = mx.getUserId();
  if (!userId) return false;
  const readUpToId = room.getEventReadUpTo(userId);
  const liveEvents = room.getLiveTimeline().getEvents();

  if (liveEvents[liveEvents.length - 1]?.getSender() === userId) {
    return false;
  }

  for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
    const event = liveEvents[i];
    if (!event) return false;
    if (event.getId() === readUpToId) return false;
    if (isNotificationEvent(event)) return true;
  }
  return true;
};

export const getUnreadInfo = (room: Room): UnreadInfo => {
  const total = room.getUnreadNotificationCount(NotificationCountType.Total);
  const highlight = room.getUnreadNotificationCount(NotificationCountType.Highlight);
  return {
    roomId: room.roomId,
    highlight,
    total: highlight > total ? highlight : total,
  };
};

export const getUnreadInfos = (mx: MatrixClient): UnreadInfo[] => {
  const unreadInfos = mx.getRooms().reduce<UnreadInfo[]>((unread, room) => {
    if (room.isSpaceRoom()) return unread;
    if (room.getMyMembership() !== 'join') return unread;
    if (getNotificationType(mx, room.roomId) === NotificationType.Mute) return unread;

    if (roomHaveUnread(mx, room)) {
      unread.push(getUnreadInfo(room));
    }

    return unread;
  }, []);
  return unreadInfos;
};

export const joinRuleToIconSrc = (
  icons: Record<IconName, IconSrc>,
  joinRule: JoinRule,
  space: boolean
): IconSrc | undefined => {
  if (joinRule === JoinRule.Restricted) {
    return space ? icons.Space : icons.Hash;
  }
  if (joinRule === JoinRule.Knock) {
    return space ? icons.SpaceLock : icons.HashLock;
  }
  if (joinRule === JoinRule.Invite) {
    return space ? icons.SpaceLock : icons.HashLock;
  }
  if (joinRule === JoinRule.Public) {
    return space ? icons.SpaceGlobe : icons.HashGlobe;
  }
  return undefined;
};

export const getRoomAvatarUrl = (mx: MatrixClient, room: Room): string | undefined => {
  const url =
    room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 32, 32, 'crop', undefined, false) ??
    undefined;
  if (url) return url;
  return room.getAvatarUrl(mx.baseUrl, 32, 32, 'crop') ?? undefined;
};

export const parseReplyBody = (userId: string, body: string) =>
  `> <${userId}> ${body.replace(/\n/g, '\n> ')}\n\n`;

export const parseReplyFormattedBody = (
  roomId: string,
  userId: string,
  eventId: string,
  formattedBody: string
): string => {
  const replyToLink = `<a href="https://matrix.to/#/${encodeURIComponent(
    roomId
  )}/${encodeURIComponent(eventId)}">In reply to</a>`;
  const userLink = `<a href="https://matrix.to/#/${encodeURIComponent(userId)}">${userId}</a>`;

  return `<mx-reply><blockquote>${replyToLink}${userLink}<br />${formattedBody}</blockquote></mx-reply>`;
};
