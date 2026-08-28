import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useClient } from '../useClient';
import { useObservableValue } from '../useObservableValue';
import { GetRoomHeroesCallback } from './useRoomHeros';
import { roomMemberContentAvatarUrl } from '../../utils/room';
import { roomToHeroMembersAtom } from '../../state/room/roomToHeroMembers';

export type GetRoomAvatarCallback = (roomId: string) => string | undefined;

export const useGetRoomAvatar = (getRoomHeroes: GetRoomHeroesCallback): GetRoomAvatarCallback => {
  const ct = useClient();
  const roomToAvatar = useObservableValue(ct.roomToAvatar);
  const roomToHeroMembers = useAtomValue(roomToHeroMembersAtom);

  const getRoomAvatar: GetRoomAvatarCallback = useCallback(
    (roomId: string) => {
      const avatar = roomToAvatar.get(roomId);
      if (avatar) return avatar;

      const members = roomToHeroMembers?.get(roomId);

      const heroesAvatar: string[] = [];
      getRoomHeroes(roomId).forEach((userId) => {
        const content = members?.get(userId)?.content;
        const avatarUrl = content ? roomMemberContentAvatarUrl(content) : undefined;
        if (avatarUrl) heroesAvatar.push(avatarUrl);
      });

      return heroesAvatar[0];
    },
    [roomToAvatar, getRoomHeroes, roomToHeroMembers]
  );

  return getRoomAvatar;
};
