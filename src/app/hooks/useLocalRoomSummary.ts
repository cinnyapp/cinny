import { GuestAccess, HistoryVisibility, JoinRule, Room } from 'matrix-js-sdk';
import { getStateEvent } from '../utils/room';
import { StateEvent } from '../../types/matrix/room';

export type LocalRoomSummary = {
  roomId: string;
  name: string;
  topic?: string;
  avatarUrl?: string;
  canonicalAlias?: string;
  worldReadable?: boolean;
  guestCanJoin?: boolean;
  memberCount?: number;
  roomType?: string;
  joinRule?: JoinRule;
};
export const useLocalRoomSummary = (room: Room): LocalRoomSummary => {
  const topicEvent = getStateEvent(room, StateEvent.RoomTopic);
  const topicContent = topicEvent?.getContent();
  const topic =
    topicContent && typeof topicContent.topic === 'string' ? topicContent.topic : undefined;

  const historyEvent = getStateEvent(room, StateEvent.RoomHistoryVisibility);
  const historyContent = historyEvent?.getContent();
  const worldReadable =
    historyContent && typeof historyContent.history_visibility === 'string'
      ? historyContent.history_visibility === HistoryVisibility.WorldReadable
      : undefined;

  const guestCanJoin = room.getGuestAccess() === GuestAccess.CanJoin;

  return {
    roomId: room.roomId,
    name: room.name,
    topic,
    avatarUrl: room.getMxcAvatarUrl() ?? undefined,
    canonicalAlias: room.getCanonicalAlias() ?? undefined,
    worldReadable,
    guestCanJoin,
    memberCount: room.getJoinedMemberCount(),
    roomType: room.getType(),
    joinRule: room.getJoinRule(),
  };
};
