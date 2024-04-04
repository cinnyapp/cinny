import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { MatrixClient } from 'matrix-js-sdk';
import { useCallback } from 'react';
import { getAllParents, isRoom, isSpace, isUnsupportedRoom } from '../../utils/room';
import { compareRoomsEqual } from '../room-list/utils';
import { allRoomsAtom } from '../room-list/roomList';
import { RoomToParents } from '../../../types/matrix/room';

export const useSpaces = (mx: MatrixClient, roomsAtom: typeof allRoomsAtom) => {
  const selector = useCallback(
    (rooms: string[]) => rooms.filter((roomId) => isSpace(mx.getRoom(roomId))),
    [mx]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useOrphanSpaces = (
  mx: MatrixClient,
  roomsAtom: typeof allRoomsAtom,
  roomToParents: RoomToParents
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter((roomId) => isSpace(mx.getRoom(roomId)) && !roomToParents.has(roomId)),
    [mx, roomToParents]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useSpaceChildSpacesRecursive = (
  mx: MatrixClient,
  spaceId: string,
  roomsAtom: typeof allRoomsAtom,
  roomToParents: RoomToParents
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter(
        (roomId) =>
          isSpace(mx.getRoom(roomId)) &&
          roomToParents.has(roomId) &&
          getAllParents(roomToParents, roomId).has(spaceId)
      ),
    [mx, spaceId, roomToParents]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useSpaceChildRooms = (
  mx: MatrixClient,
  spaceId: string,
  roomsAtom: typeof allRoomsAtom,
  mDirects: Set<string>,
  roomToParents: RoomToParents
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter(
        (roomId) =>
          isRoom(mx.getRoom(roomId)) &&
          !mDirects.has(roomId) &&
          roomToParents.get(roomId)?.has(spaceId)
      ),
    [mx, spaceId, mDirects, roomToParents]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useSpaceChildRoomsRecursive = (
  mx: MatrixClient,
  spaceId: string,
  roomsAtom: typeof allRoomsAtom,
  mDirects: Set<string>,
  roomToParents: RoomToParents
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter(
        (roomId) =>
          isRoom(mx.getRoom(roomId)) &&
          !mDirects.has(roomId) &&
          roomToParents.has(roomId) &&
          getAllParents(roomToParents, roomId).has(spaceId)
      ),
    [mx, spaceId, mDirects, roomToParents]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useSpaceChildDirects = (
  mx: MatrixClient,
  spaceId: string,
  roomsAtom: typeof allRoomsAtom,
  mDirects: Set<string>,
  roomToParents: RoomToParents
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter(
        (roomId) =>
          isRoom(mx.getRoom(roomId)) &&
          mDirects.has(roomId) &&
          roomToParents.get(roomId)?.has(spaceId)
      ),
    [mx, spaceId, mDirects, roomToParents]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useSpaceChildDirectsRecursive = (
  mx: MatrixClient,
  spaceId: string,
  roomsAtom: typeof allRoomsAtom,
  mDirects: Set<string>,
  roomToParents: RoomToParents
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter(
        (roomId) =>
          isRoom(mx.getRoom(roomId)) &&
          mDirects.has(roomId) &&
          roomToParents.has(roomId) &&
          getAllParents(roomToParents, roomId).has(spaceId)
      ),
    [mx, spaceId, mDirects, roomToParents]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useRooms = (
  mx: MatrixClient,
  roomsAtom: typeof allRoomsAtom,
  mDirects: Set<string>
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter((roomId) => isRoom(mx.getRoom(roomId)) && !mDirects.has(roomId)),
    [mx, mDirects]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useOrphanRooms = (
  mx: MatrixClient,
  roomsAtom: typeof allRoomsAtom,
  mDirects: Set<string>,
  roomToParents: RoomToParents
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter(
        (roomId) =>
          isRoom(mx.getRoom(roomId)) && !mDirects.has(roomId) && !roomToParents.has(roomId)
      ),
    [mx, mDirects, roomToParents]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useDirects = (
  mx: MatrixClient,
  roomsAtom: typeof allRoomsAtom,
  mDirects: Set<string>
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter((roomId) => isRoom(mx.getRoom(roomId)) && mDirects.has(roomId)),
    [mx, mDirects]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useUnsupportedRooms = (mx: MatrixClient, roomsAtom: typeof allRoomsAtom) => {
  const selector = useCallback(
    (rooms: string[]) => rooms.filter((roomId) => isUnsupportedRoom(mx.getRoom(roomId))),
    [mx]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};
