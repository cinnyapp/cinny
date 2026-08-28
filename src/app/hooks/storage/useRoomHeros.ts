import { useCallback, useMemo } from 'react';
import { PendingObservableResult } from 'neurone/lib/utils/observable';
import { StateEventWithoutRoomId } from 'neurone/lib/api/types';
import { useClient } from '../useClient';
import {
  useComputedPendingObservableResult,
  useObservableValue,
  useObservableValuePromise,
} from '../useObservableValue';
import { getJoinRoomMemberId } from '../../../client/storage/collections';

export type UserIdToRoomMember = Map<string, StateEventWithoutRoomId>;
export type RoomToHeroMembers = Map<string, UserIdToRoomMember>;

export type GetRoomHeroesCallback = (roomId: string) => string[];

export const useRoomHeroes = (
  roomOrRooms: string | string[]
): [GetRoomHeroesCallback, PendingObservableResult<RoomToHeroMembers>] => {
  const ct = useClient();
  const roomToSummary = useObservableValue(ct.roomToSummary);
  const directRoomToUser = useObservableValue(ct.directRoomToUser);

  const getHeroes: GetRoomHeroesCallback = useCallback(
    (roomId): string[] => {
      const heroes = roomToSummary.get(roomId)?.['m.heroes'];
      if (heroes && heroes.length > 0) return heroes;

      const dmUserId = directRoomToUser.get(roomId);
      return dmUserId ? [dmUserId] : [];
    },
    [roomToSummary, directRoomToUser]
  );

  const membersResult = useObservableValuePromise(
    useMemo(() => {
      const ids = Array.isArray(roomOrRooms)
        ? roomOrRooms.flatMap((roomId) =>
            getHeroes(roomId).map((userId) => getJoinRoomMemberId(roomId, userId))
          )
        : getHeroes(roomOrRooms).map((userId) => getJoinRoomMemberId(roomOrRooms, userId));

      return ct.storage.joinRoomMember.observableRead.getMultiple(ids);
    }, [roomOrRooms, getHeroes, ct])
  );

  const roomToHeroesResult: PendingObservableResult<RoomToHeroMembers> =
    useComputedPendingObservableResult(
      membersResult,
      useCallback((members) => {
        const roomToHeroes = new Map<string, UserIdToRoomMember>();
        members.forEach((member) => {
          if (!member) return;
          const { roomId, userId, event } = member;
          const userToEvent: UserIdToRoomMember = roomToHeroes.get(roomId) ?? new Map();
          userToEvent.set(userId, event);
          roomToHeroes.set(roomId, userToEvent);
        });
        return roomToHeroes;
      }, [])
    );

  return [getHeroes, roomToHeroesResult];
};
