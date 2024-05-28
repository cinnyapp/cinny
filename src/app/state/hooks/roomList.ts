import { Atom, useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { MatrixClient } from 'matrix-js-sdk';
import { useCallback, useMemo } from 'react';
import { getAllParents, isRoom, isSpace, isUnsupportedRoom } from '../../utils/room';
import { compareRoomsEqual } from '../room-list/utils';
import { RoomToParents } from '../../../types/matrix/room';

export type RoomsAtom = Atom<string[]>;
export type RoomSelector = (roomId: string) => boolean | undefined;

export const selectedRoomsAtom = (
  roomsAtom: RoomsAtom,
  selector: (roomId: string) => boolean | undefined
) => selectAtom(roomsAtom, (rooms) => rooms.filter(selector), compareRoomsEqual);

export const useSelectedRooms = (roomsAtom: RoomsAtom, selector: RoomSelector) => {
  const anAtom = useMemo(() => selectedRoomsAtom(roomsAtom, selector), [roomsAtom, selector]);

  return useAtomValue(anAtom);
};

export type SpaceChildSelectorFactory = (parentId: string) => RoomSelector;

export const useRecursiveChildScopeFactory = (
  mx: MatrixClient,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory =>
  useCallback(
    (parentId: string) => (roomId) =>
      isRoom(mx.getRoom(roomId)) &&
      roomToParents.has(roomId) &&
      getAllParents(roomToParents, roomId).has(parentId),
    [mx, roomToParents]
  );

export const useChildSpaceScopeFactory = (
  mx: MatrixClient,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory =>
  useCallback(
    (parentId: string) => (roomId) =>
      isSpace(mx.getRoom(roomId)) && roomToParents.get(roomId)?.has(parentId),
    [mx, roomToParents]
  );

export const useRecursiveChildSpaceScopeFactory = (
  mx: MatrixClient,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory =>
  useCallback(
    (parentId: string) => (roomId) =>
      isSpace(mx.getRoom(roomId)) &&
      roomToParents.has(roomId) &&
      getAllParents(roomToParents, roomId).has(parentId),
    [mx, roomToParents]
  );

export const useChildRoomScopeFactory = (
  mx: MatrixClient,
  mDirects: Set<string>,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory =>
  useCallback(
    (parentId: string) => (roomId) =>
      isRoom(mx.getRoom(roomId)) &&
      !mDirects.has(roomId) &&
      roomToParents.get(roomId)?.has(parentId),
    [mx, mDirects, roomToParents]
  );

export const useRecursiveChildRoomScopeFactory = (
  mx: MatrixClient,
  mDirects: Set<string>,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory =>
  useCallback(
    (parentId: string) => (roomId) =>
      isRoom(mx.getRoom(roomId)) &&
      !mDirects.has(roomId) &&
      roomToParents.has(roomId) &&
      getAllParents(roomToParents, roomId).has(parentId),
    [mx, mDirects, roomToParents]
  );

export const useChildDirectScopeFactory = (
  mx: MatrixClient,
  mDirects: Set<string>,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory =>
  useCallback(
    (parentId: string) => (roomId) =>
      isRoom(mx.getRoom(roomId)) &&
      mDirects.has(roomId) &&
      roomToParents.get(roomId)?.has(parentId),
    [mx, mDirects, roomToParents]
  );

export const useRecursiveChildDirectScopeFactory = (
  mx: MatrixClient,
  mDirects: Set<string>,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory =>
  useCallback(
    (parentId: string) => (roomId) =>
      isRoom(mx.getRoom(roomId)) &&
      mDirects.has(roomId) &&
      roomToParents.has(roomId) &&
      getAllParents(roomToParents, roomId).has(parentId),
    [mx, mDirects, roomToParents]
  );

export const useSpaceChildren = (
  roomsAtom: RoomsAtom,
  spaceId: string,
  selectorFactory: SpaceChildSelectorFactory
) => {
  const recursiveChildRoomSelector = useMemo(
    () => selectorFactory(spaceId),
    [selectorFactory, spaceId]
  );
  return useSelectedRooms(roomsAtom, recursiveChildRoomSelector);
};

export const useSpaces = (mx: MatrixClient, roomsAtom: RoomsAtom) => {
  const selector: RoomSelector = useCallback((roomId) => isSpace(mx.getRoom(roomId)), [mx]);
  return useSelectedRooms(roomsAtom, selector);
};

export const useOrphanSpaces = (
  mx: MatrixClient,
  roomsAtom: RoomsAtom,
  roomToParents: RoomToParents
) => {
  const selector: RoomSelector = useCallback(
    (roomId) => isSpace(mx.getRoom(roomId)) && !roomToParents.has(roomId),
    [mx, roomToParents]
  );
  return useSelectedRooms(roomsAtom, selector);
};

export const useRooms = (mx: MatrixClient, roomsAtom: RoomsAtom, mDirects: Set<string>) => {
  const selector: RoomSelector = useCallback(
    (roomId: string) => isRoom(mx.getRoom(roomId)) && !mDirects.has(roomId),
    [mx, mDirects]
  );
  return useSelectedRooms(roomsAtom, selector);
};

export const useOrphanRooms = (
  mx: MatrixClient,
  roomsAtom: RoomsAtom,
  mDirects: Set<string>,
  roomToParents: RoomToParents
) => {
  const selector: RoomSelector = useCallback(
    (roomId) => isRoom(mx.getRoom(roomId)) && !mDirects.has(roomId) && !roomToParents.has(roomId),
    [mx, mDirects, roomToParents]
  );
  return useSelectedRooms(roomsAtom, selector);
};

export const useDirects = (mx: MatrixClient, roomsAtom: RoomsAtom, mDirects: Set<string>) => {
  const selector: RoomSelector = useCallback(
    (roomId) => isRoom(mx.getRoom(roomId)) && mDirects.has(roomId),
    [mx, mDirects]
  );
  return useSelectedRooms(roomsAtom, selector);
};

export const useUnsupportedRooms = (mx: MatrixClient, roomsAtom: RoomsAtom) => {
  const selector: RoomSelector = useCallback(
    (roomId) => isUnsupportedRoom(mx.getRoom(roomId)),
    [mx]
  );
  return useSelectedRooms(roomsAtom, selector);
};
