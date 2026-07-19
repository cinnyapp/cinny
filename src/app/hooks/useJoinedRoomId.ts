import { isRoomAlias } from '../utils/matrix';
import { useClient } from './useClient';

export const useJoinedRoomId = (allRooms: string[], roomIdOrAlias: string): string | undefined => {
  const ct = useClient();

  const roomId = isRoomAlias(roomIdOrAlias)
    ? ct.rooms.join.read.find((rId) => ct.roomToAlias.read.get(rId) === roomIdOrAlias)
    : roomIdOrAlias;

  if (roomId && allRooms.includes(roomId)) return roomId;

  return undefined;
};
