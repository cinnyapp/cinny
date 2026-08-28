import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useClient } from '../useClient';
import { useObservableValue } from '../useObservableValue';
import { GetRoomHeroesCallback } from './useRoomHeros';
import { getMxIdLocalPart } from '../../utils/matrix';
import { roomMemberContentDisplayname } from '../../utils/room';
import { roomToHeroMembersAtom } from '../../state/room/roomToHeroMembers';

export type GetRoomNameCallback = (roomId: string) => string | undefined;

export const useGetRoomName = (getRoomHeroes: GetRoomHeroesCallback): GetRoomNameCallback => {
  const ct = useClient();
  const roomToName = useObservableValue(ct.roomToName);
  const roomToAlias = useObservableValue(ct.roomToAlias);
  const roomToHeroMembers = useAtomValue(roomToHeroMembersAtom);

  const getRoomName: GetRoomNameCallback = useCallback(
    (roomId: string) => {
      const name = roomToName.get(roomId);
      if (name) return name;

      const alias = roomToAlias.get(roomId);
      if (alias) return alias;

      const members = roomToHeroMembers?.get(roomId);

      const heroNames: string[] = getRoomHeroes(roomId).map((userId) => {
        const member = members?.get(userId);
        if (!member) return getMxIdLocalPart(userId) ?? userId;
        const { content } = member;
        const username =
          roomMemberContentDisplayname(content)?.trim() || getMxIdLocalPart(userId) || userId;
        return username;
      });

      if (heroNames.length === 0) {
        return undefined;
      }

      if (heroNames.length === 1) {
        return heroNames[0];
      }

      if (heroNames.length === 2) {
        return `${heroNames[0]} & ${heroNames[1]}`;
      }

      return `${heroNames.slice(0, -1).join(', ')} & ${heroNames.at(-1)}`;
    },
    [roomToName, roomToAlias, getRoomHeroes, roomToHeroMembers]
  );

  return getRoomName;
};
