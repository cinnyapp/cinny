import { useCallback } from 'react';
import { useClient } from '../useClient';
import { useObservableValue } from '../useObservableValue';
import { GetRoomHeroesCallback, RoomToHeroMembers } from './useRoomHeros';
import { roomMemberContentAvatarUrl } from '../../utils/room';

export type GetRoomAvatarCallback = (roomId: string) => string | undefined;

export const useGetRoomAvatar = (
  getRoomHeroes: GetRoomHeroesCallback,
  roomToHeroMembers: RoomToHeroMembers | undefined
): GetRoomAvatarCallback => {
  const ct = useClient();
  const roomToAvatar = useObservableValue(ct.roomToAvatar);

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
