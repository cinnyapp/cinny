import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { MatrixClient } from 'matrix-js-sdk';
import { useCallback } from 'react';
import { getAllParents, isRoom, isSpace, isUnsupportedRoom } from '../../utils/room';
import { compareRoomsEqual } from '../room-list/utils';
import { allRoomsAtom } from '../room-list/roomList';
import { RoomToParents } from '../../../types/matrix/room';

/**
 * select list of space room id's from all rooms
 * @param mx to check room type
 * @param roomsAtom to pick rooms
 * @returns list of space id's
 */
export const useSpaces = (mx: MatrixClient, roomsAtom: typeof allRoomsAtom) => {
  const selector = useCallback(
    (rooms: string[]) => rooms.filter((roomId) => isSpace(mx.getRoom(roomId))),
    [mx]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

/**
 * select list of space room ids from all rooms which doesn't have any parent
 * @param mx to check room type
 * @param roomsAtom to pick rooms
 * @param roomToParents: to exclude space's with parent
 * @returns list of space ids
 */
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

/**
 * select list of all room ids from all rooms for which spaceId is in all parents
 * @param mx to check room type
 * @param spaceId as root parent
 * @param roomsAtom to pick rooms
 * @param roomToParents: to include child room
 * @returns list of space ids
 */
export const useSpaceRecursiveChildSpaces = (
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

/**
 * select list of all room ids from all rooms for which spaceId is in parents
 * @param mx to check room type
 * @param spaceId as root parent
 * @param roomsAtom to pick rooms
 * @param roomToParents: to include child room
 * @returns list of space ids
 */
export const useSpaceChildRooms = (
  mx: MatrixClient,
  spaceId: string,
  roomsAtom: typeof allRoomsAtom,
  roomToParents: RoomToParents
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter(
        (roomId) => isRoom(mx.getRoom(roomId)) && roomToParents.get(roomId)?.has(spaceId)
      ),
    [mx, spaceId, roomToParents]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

/**
 * select list of all room ids from all rooms for which spaceId is in all parents
 * @param mx to check room type
 * @param spaceId as root parent
 * @param roomsAtom to pick rooms
 * @param mDirects to include only direct rooms
 * @param roomToParents: to include child room
 * @returns list of direct room ids
 */
export const useSpaceRecursiveChildDirects = (
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

/**
 * select list of all room ids from all rooms for which spaceId is in parents and is in mDirects
 * @param mx to check room type
 * @param spaceId as root parent
 * @param roomsAtom to pick rooms
 * @param mDirects to include only direct rooms
 * @param roomToParents: to include child rooms
 * @returns list of space ids
 */
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

/**
 * select list of room ids from all rooms which are not direct(dm)
 * @param mx to check room type
 * @param roomsAtom to pick rooms
 * @param mDirects to exclude direct rooms
 * @returns list of room ids
 */
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

/**
 * select list of room ids from all rooms which are not direct(dm) and doesn't have any parent
 * @param mx to check room type
 * @param roomsAtom to pick rooms
 * @param mDirects to exclude direct rooms
 * @param roomToParents to exclude rooms with parent
 * @returns list of room ids
 */
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

/**
 * select list of room ids from all rooms which are direct(dm)
 * @param mx to check room type
 * @param roomsAtom to pick rooms
 * @param mDirects to only include direct rooms
 * @returns list of room ids
 */
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

/**
 * select list of room ids for which room type is unsupported
 * @param mx to check room type
 * @param roomsAtom to pick rooms
 * @returns list of unsupported room ids
 */
export const useUnsupportedRooms = (mx: MatrixClient, roomsAtom: typeof allRoomsAtom) => {
  const selector = useCallback(
    (rooms: string[]) => rooms.filter((roomId) => isUnsupportedRoom(mx.getRoom(roomId))),
    [mx]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};
