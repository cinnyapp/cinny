import { useParams } from 'react-router-dom';
import { isRoomAlias } from '../../utils/matrix';
import { useClient } from '../useClient';

export const useSelectedRoom = (): string | undefined => {
  const ct = useClient();

  const { roomIdOrAlias } = useParams();

  if (roomIdOrAlias && isRoomAlias(roomIdOrAlias)) {
    return ct.rooms.join.read.find((roomId) => ct.roomToAlias.read.get(roomId) === roomIdOrAlias);
  }

  return roomIdOrAlias;
};
