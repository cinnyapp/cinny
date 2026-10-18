import { IconName, IconSrc } from 'folds';
import { MessageEventWithoutRoomId, RoomMembership } from 'neurone/lib/api/types';
import { JoinRule, MessageEvent, RoomToParents, RoomType } from '../../types/matrix/room';
import { JoinRoomMemberObject } from '../../client/storage/collections';
import { MentionsContent, MsgType, ReactionContent, RelationType } from '../../types/matrix/common';
import { ClientContext } from '../../client/context';
import { rContent, rInReplyTo, rRelatesTo } from '../../client/reader';
import { replaced } from '../../client/room/relations';

export const isCallRoom = (roomType?: string) => roomType === 'org.matrix.msc3417.call';

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

export const getOrphanParents = (roomToParents: RoomToParents, roomId: string): string[] => {
  const parents = getAllParents(roomToParents, roomId);
  const orphanParents = Array.from(parents).filter(
    (parentRoomId) => !roomToParents.has(parentRoomId)
  );

  return orphanParents;
};

export const getRoomIconSrc = (
  icons: Record<IconName, IconSrc>,
  roomType?: string,
  joinRule?: JoinRule
): IconSrc => {
  if (roomType === RoomType.Space) {
    if (joinRule === 'public') return icons.SpaceGlobe;
    if (joinRule === 'invite' || joinRule === 'knock' || joinRule === 'private') {
      return icons.SpaceLock;
    }
    return icons.Space;
  }

  if (roomType === RoomType.Call) {
    if (joinRule === 'public') return icons.VolumeHighGlobe;
    if (joinRule === 'invite' || joinRule === 'knock' || joinRule === 'private') {
      return icons.VolumeHighLock;
    }
    return icons.VolumeHigh;
  }

  if (joinRule === 'public') return icons.HashGlobe;
  if (joinRule === 'invite' || joinRule === 'knock' || joinRule === 'private') {
    return icons.HashLock;
  }
  return icons.Hash;
};

export const trimReplyFromBody = (body: string): string => {
  const match = body.match(/^> <.+?> .+\n(>.*\n)*?\n/m);
  if (!match) return body;
  return body.slice(match[0].length);
};

export const trimReplyFromFormattedBody = (formattedBody: string): string => {
  const suffix = '</mx-reply>';
  const i = formattedBody.lastIndexOf(suffix);
  if (i < 0) {
    return formattedBody;
  }
  return formattedBody.slice(i + suffix.length);
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

export const roomMemberContentDisplayname = (content: object): string | undefined => {
  const name =
    'displayname' in content && typeof content.displayname === 'string'
      ? content.displayname.trim()
      : undefined;

  return name;
};

export const roomMemberContentAvatarUrl = (content: object): string | undefined => {
  const url =
    'avatar_url' in content && typeof content.avatar_url === 'string'
      ? content.avatar_url.trim()
      : undefined;

  return url?.startsWith('mxc://') ? url : undefined;
};

export const roomMemberContentMembership = (content: object): RoomMembership | undefined => {
  const membership =
    'membership' in content && typeof content.membership === 'string'
      ? (content.membership as RoomMembership)
      : undefined;

  return membership;
};

export const getMemberSearchStr = (
  member: JoinRoomMemberObject,
  query: string,
  getName: (mxId: string) => string
): string[] => [
  getName(member.userId),
  query.startsWith('@') || query.indexOf(':') > -1 ? member.userId : getName(member.userId),
];

export const getReactionContent = (eventId: string, key: string, shortcode?: string) => ({
  'm.relates_to': {
    event_id: eventId,
    key,
    rel_type: 'm.annotation',
  },
  shortcode,
});

export type ReactionGroup = {
  key: string;
  users: Set<string>;
  events: MessageEventWithoutRoomId<ReactionContent>[];
  shortcode?: string;
  firstTs: number;
};
export const getReactionGroups = (
  reactions: MessageEventWithoutRoomId<ReactionContent>[]
): Array<ReactionGroup> => {
  const groups = new Map<string, ReactionGroup>();

  reactions.forEach((event) => {
    const { key } = event.content['m.relates_to'];
    const userId = event.sender;
    const { shortcode } = event.content;
    const ts = event.origin_server_ts;

    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        users: new Set([userId]),
        events: [event],
        shortcode,
        firstTs: ts,
      });
    } else {
      existing.users.add(userId);
      existing.events.push(event);

      if (!existing.shortcode && shortcode) {
        existing.shortcode = shortcode;
      }

      // keep earliest timestamp
      if (ts < existing.firstTs) {
        existing.firstTs = ts;
      }
    }
  });

  return Array.from(groups.values()).sort((a, b) => a.firstTs - b.firstTs);
};

export const getLatestEditEvent = (
  event: MessageEventWithoutRoomId,
  events?: MessageEventWithoutRoomId[],
  redacted?: Set<string>
): MessageEventWithoutRoomId | undefined => {
  let replacement: MessageEventWithoutRoomId | undefined;
  const pickLatest = (e: MessageEventWithoutRoomId) => {
    if (redacted?.has(e.event_id) || event.sender !== e.sender) return;
    if (!replacement) {
      replacement = e;
      return;
    }
    if (replacement.origin_server_ts < e.origin_server_ts) {
      replacement = e;
    }
  };

  const aggregated = replaced(event);
  if (aggregated) pickLatest(aggregated);
  events?.forEach(pickLatest);

  return replacement;
};

export const getReplyId = (content: object): string | undefined =>
  rInReplyTo.eventId(rRelatesTo.inReplyTo(rContent.relatesTo(content)));

export const fallbackReply = (content: object): boolean => {
  const relatesTo = rContent.relatesTo(content);

  if (rRelatesTo.relType(relatesTo) === RelationType.Thread) {
    return rRelatesTo.isFallingBack(relatesTo) ?? false;
  }
  return false;
};

export const getThreadId = (event: MessageEventWithoutRoomId): string | undefined => {
  const { content } = event;

  const relatesTo = rContent.relatesTo(content);
  if (rRelatesTo.relType(relatesTo) === RelationType.Thread) {
    return rRelatesTo.eventId(relatesTo);
  }

  return undefined;
};

export const canEditEvent = (ct: ClientContext, event: MessageEventWithoutRoomId) => {
  const { content } = event;
  const msgType = rContent.msgtype(content);
  if (!msgType) return false;

  const relationType = rRelatesTo.relType(rContent.relatesTo(content));

  return (
    event.sender === ct.session.userId &&
    (!relationType || relationType === RelationType.Thread) &&
    event.type === MessageEvent.RoomMessage &&
    (msgType === MsgType.Text || msgType === MsgType.Emote || msgType === MsgType.Notice)
  );
};

export const getMentionContent = (userIds: string[], room: boolean): MentionsContent => {
  const mMentions: MentionsContent = {};
  if (userIds.length > 0) {
    mMentions.user_ids = userIds;
  }
  if (room) {
    mMentions.room = true;
  }

  return mMentions;
};

export const guessPerfectParent = (
  roomId: string,
  parents: string[],
  getCreators: (roomId: string) => Set<string> | undefined,
  getPowerLevelContent: (roomId: string) =>
    | {
        users?: Record<string, number>;
        users_default?: number;
      }
    | undefined
): string | undefined => {
  if (parents.length === 1) {
    return parents[0];
  }

  const getSpecialUsers = (rId: string): string[] => {
    const specialUsers: Set<string> = new Set();

    getCreators(rId)?.forEach((c) => specialUsers.add(c));

    const { users_default: usersDefault, users } = getPowerLevelContent(rId) ?? {};
    const defaultPower = typeof usersDefault === 'number' ? usersDefault : 0;

    if (typeof users === 'object')
      Object.keys(users).forEach((userId) => {
        if (users[userId] > defaultPower) {
          specialUsers.add(userId);
        }
      });

    return Array.from(specialUsers);
  };

  let perfectParent: string | undefined;
  let score = 0;

  const roomSpecialUsers = getSpecialUsers(roomId);
  parents.forEach((parentId) => {
    const parentSpecialUsers = getSpecialUsers(parentId);
    const matchedUsersCount = parentSpecialUsers.filter((userId) =>
      roomSpecialUsers.includes(userId)
    ).length;

    if (matchedUsersCount > score) {
      score = matchedUsersCount;
      perfectParent = parentId;
    }
  });

  return perfectParent;
};
