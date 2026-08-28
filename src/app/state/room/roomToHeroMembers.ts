import { useCallback, useEffect } from 'react';
import { StateEventWithoutRoomId } from 'neurone/lib/api/types';
import { atom, useSetAtom } from 'jotai';
import { ClientContext } from '../../../client/context';
import { useObservableValue } from '../../hooks/useObservableValue';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { getJoinRoomMemberId } from '../../../client/storage/collections';

export type UserIdToRoomMember = Map<string, StateEventWithoutRoomId>;
export type RoomToHeroMembers = Map<string, UserIdToRoomMember>;

export const roomToHeroMembersAtom = atom<RoomToHeroMembers>(new Map());

export const useBindRoomToHeroMembers = (
  ct: ClientContext,
  heroMembersAtom: typeof roomToHeroMembersAtom
) => {
  const setHeroMembersAtom = useSetAtom(heroMembersAtom);

  const rooms = useObservableValue(ct.rooms.join);
  const roomToSummary = useObservableValue(ct.roomToSummary);
  const directRoomToUser = useObservableValue(ct.directRoomToUser);

  const [heroMembersState, loadHeroMembers] = useAsyncCallback(
    useCallback(async () => {
      const getHeroes = (roomId: string): string[] => {
        const heroes = roomToSummary.get(roomId)?.['m.heroes'];
        if (heroes && heroes.length > 0) return heroes;

        const dmUserId = directRoomToUser.get(roomId);
        return dmUserId ? [dmUserId] : [];
      };

      const ids = rooms.flatMap((roomId) =>
        getHeroes(roomId).map((userId) => getJoinRoomMemberId(roomId, userId))
      );

      return ct.storage.joinRoomMember.observableRead.getMultiple(ids);
    }, [ct, rooms, roomToSummary, directRoomToUser])
  );

  useEffect(() => {
    loadHeroMembers();
  }, [loadHeroMembers]);

  const heroMembers =
    heroMembersState.status === AsyncStatus.Success ? heroMembersState.data : undefined;

  // dispose
  useEffect(() => () => heroMembers?.dispose(), [heroMembers]);

  useEffect(() => {
    const processHeroMembers = () => {
      const roomToHeroes = new Map<string, UserIdToRoomMember>();

      heroMembers?.read.forEach((member) => {
        if (!member) return;
        const { roomId, userId, event } = member;
        const userToEvent: UserIdToRoomMember = roomToHeroes.get(roomId) ?? new Map();
        userToEvent.set(userId, event);
        roomToHeroes.set(roomId, userToEvent);
      });

      setHeroMembersAtom(roomToHeroes);
    };

    if (heroMembers) {
      processHeroMembers();
    }
    const unsubscribe = heroMembers?.subscribe(processHeroMembers);
    return () => {
      unsubscribe?.();
    };
  }, [heroMembers, setHeroMembersAtom]);
};
