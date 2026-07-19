import { useCallback } from 'react';
import { useClient } from '../useClient';
import { useObservableValue } from '../useObservableValue';
import { GetRoomHeroesCallback, RoomToHeroMembers } from './useRoomHeros';
import { getMxIdLocalPart } from '../../utils/matrix';
import { roomMemberContentDisplayname } from '../../utils/room';

export type GetRoomNameCallback = (roomId: string) => string | undefined;

export const useGetRoomName = (
  getRoomHeroes: GetRoomHeroesCallback,
  roomToHeroMembers: RoomToHeroMembers | undefined
): GetRoomNameCallback => {
  const ct = useClient();
  const roomToName = useObservableValue(ct.roomToName);
  const roomToAlias = useObservableValue(ct.roomToAlias);

  const getRoomName: GetRoomNameCallback = useCallback(
    (roomId: string) => {
      const name = roomToName.get(roomId);
      if (name) return name;

      const alias = roomToAlias.get(roomId);
      if (alias) return alias;

      const members = roomToHeroMembers?.get(roomId);

      const heroesName: string[] = getRoomHeroes(roomId).map((userId) => {
        const member = members?.get(userId);
        if (!member) return getMxIdLocalPart(userId) ?? userId;
        const { content } = member;
        const username =
          roomMemberContentDisplayname(content)?.trim() || getMxIdLocalPart(userId) || userId;
        return username;
      });

      if (heroesName) return heroesName.join(', ');

      return undefined;
    },
    [roomToName, roomToAlias, getRoomHeroes, roomToHeroMembers]
  );

  return getRoomName;
};
