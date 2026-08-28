import { JoinRule } from '../../types/matrix/room';
import { useRoomHeroes } from './storage/useRoomHeros';
import { useGetRoomName } from './storage/useGetRoomName';
import { useGetRoomAvatar } from './storage/useGetRoomAvatar';
import { useRoomTopic } from './storage/useRoomTopic';
import { useObservableValue } from './useObservableValue';
import { useClient } from './useClient';

export type LocalRoomSummary = {
  roomId: string;
  name?: string;
  topic?: string;
  avatarUrl?: string;
  canonicalAlias?: string;
  memberCount?: number;
  roomType?: string;
  joinRule?: JoinRule;
};
export const useLocalRoomSummary = (roomId: string): LocalRoomSummary => {
  const ct = useClient();

  const getRoomHeroes = useRoomHeroes();
  const getRoomName = useGetRoomName(getRoomHeroes);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes);
  const roomTopic = useRoomTopic(roomId);
  const roomToAlias = useObservableValue(ct.roomToAlias);
  const roomToJoinRule = useObservableValue(ct.roomToJoinRule);
  const roomToSummary = useObservableValue(ct.roomToSummary);
  const roomToType = useObservableValue(ct.roomToType);

  return {
    roomId,
    name: getRoomName(roomId),
    topic: roomTopic,
    avatarUrl: getRoomAvatar(roomId),
    canonicalAlias: roomToAlias.get(roomId),
    memberCount: roomToSummary.get(roomId)?.['m.joined_member_count'],
    roomType: roomToType.get(roomId),
    joinRule: roomToJoinRule.get(roomId),
  };
};
