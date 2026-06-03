import { atom, useSetAtom } from 'jotai';
import { MatrixClient, MatrixEvent, Room, RoomEvent, SyncState } from 'matrix-js-sdk';
import { useCallback, useEffect } from 'react';
import { Membership, RoomTag } from '../../../types/matrix/room';
import { useSyncState } from '../../hooks/useSyncState';

export type FavouriteRoomsAction =
  | { type: 'RESET'; rooms: Set<string> }
  | { type: 'PUT'; roomId: string }
  | { type: 'DELETE'; roomId: string };

export const isRoomFavourite = (room: Room): boolean => room.tags[RoomTag.Favourite] !== undefined;

const getFavouriteRooms = (mx: MatrixClient): Set<string> => {
  const favourites = new Set<string>();
  mx.getRooms().forEach((room) => {
    if (isRoomFavourite(room)) favourites.add(room.roomId);
  });
  return favourites;
};

const baseFavouriteRoomsAtom = atom(new Set<string>());
export const favouriteRoomsAtom = atom<Set<string>, [FavouriteRoomsAction], undefined>(
  (get) => get(baseFavouriteRoomsAtom),
  (get, set, action) => {
    if (action.type === 'RESET') {
      set(baseFavouriteRoomsAtom, action.rooms);
      return;
    }
    const current = get(baseFavouriteRoomsAtom);
    if (action.type === 'PUT') {
      if (current.has(action.roomId)) return;
      const next = new Set(current);
      next.add(action.roomId);
      set(baseFavouriteRoomsAtom, next);
      return;
    }
    if (action.type === 'DELETE') {
      if (!current.has(action.roomId)) return;
      const next = new Set(current);
      next.delete(action.roomId);
      set(baseFavouriteRoomsAtom, next);
    }
  }
);

export const useBindFavouriteRoomsAtom = (
  mx: MatrixClient,
  favouriteRooms: typeof favouriteRoomsAtom
) => {
  const setFavouriteRooms = useSetAtom(favouriteRooms);

  useEffect(() => {
    setFavouriteRooms({ type: 'RESET', rooms: getFavouriteRooms(mx) });
  }, [mx, setFavouriteRooms]);

  useSyncState(
    mx,
    useCallback(
      (state, prevState) => {
        if (
          (state === SyncState.Prepared && prevState === null) ||
          (state === SyncState.Syncing && prevState !== SyncState.Syncing)
        ) {
          setFavouriteRooms({ type: 'RESET', rooms: getFavouriteRooms(mx) });
        }
      },
      [mx, setFavouriteRooms]
    )
  );

  useEffect(() => {
    const handleTags = (_event: MatrixEvent, room: Room) => {
      setFavouriteRooms(
        isRoomFavourite(room)
          ? { type: 'PUT', roomId: room.roomId }
          : { type: 'DELETE', roomId: room.roomId }
      );
    };
    mx.on(RoomEvent.Tags, handleTags);
    return () => {
      mx.removeListener(RoomEvent.Tags, handleTags);
    };
  }, [mx, setFavouriteRooms]);

  useEffect(() => {
    const handleMembershipChange = (room: Room, membership: string) => {
      if (membership !== Membership.Join) {
        setFavouriteRooms({ type: 'DELETE', roomId: room.roomId });
      }
    };
    mx.on(RoomEvent.MyMembership, handleMembershipChange);
    return () => {
      mx.removeListener(RoomEvent.MyMembership, handleMembershipChange);
    };
  }, [mx, setFavouriteRooms]);
};
