import { Atom, useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useCallback, useMemo } from 'react';
import { getAllParents } from '../../utils/room';
import { compareRoomsEqual } from '../room-list/utils';
import { RoomToParents } from '../../../types/matrix/room';
import { ClientContext } from '../../../client/context';
import { useObservableValue } from '../../hooks/useObservableValue';

type RoomsAtom = Atom<string[]>;
type RoomSelector = (roomId: string) => boolean | undefined;

const selectedRoomsAtom = (
  roomsAtom: RoomsAtom,
  selector: (roomId: string) => boolean | undefined
) => selectAtom(roomsAtom, (rooms) => rooms.filter(selector), compareRoomsEqual);

const useSelectedRooms = (roomsAtom: RoomsAtom, selector: RoomSelector) => {
  const anAtom = useMemo(() => selectedRoomsAtom(roomsAtom, selector), [roomsAtom, selector]);

  return useAtomValue(anAtom);
};

type SpaceChildSelectorFactory = (parentId: string) => RoomSelector;

export const useRecursiveChildScopeFactory = (
  ct: ClientContext,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  return useCallback(
    (parentId: string) => (roomId) =>
      !spaceRooms.has(roomId) &&
      roomToParents.has(roomId) &&
      getAllParents(roomToParents, roomId).has(parentId),
    [spaceRooms, roomToParents]
  );
};

export const useChildSpaceScopeFactory = (
  ct: ClientContext,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  return useCallback(
    (parentId: string) => (roomId) =>
      spaceRooms.has(roomId) && roomToParents.get(roomId)?.has(parentId),
    [spaceRooms, roomToParents]
  );
};

export const useRecursiveChildSpaceScopeFactory = (
  ct: ClientContext,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  return useCallback(
    (parentId: string) => (roomId) =>
      spaceRooms.has(roomId) &&
      roomToParents.has(roomId) &&
      getAllParents(roomToParents, roomId).has(parentId),
    [spaceRooms, roomToParents]
  );
};

export const useChildRoomScopeFactory = (
  ct: ClientContext,
  mDirects: Set<string>,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  return useCallback(
    (parentId: string) => (roomId) =>
      !spaceRooms.has(roomId) && !mDirects.has(roomId) && roomToParents.get(roomId)?.has(parentId),
    [spaceRooms, mDirects, roomToParents]
  );
};

export const useRecursiveChildRoomScopeFactory = (
  ct: ClientContext,
  mDirects: Set<string>,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  return useCallback(
    (parentId: string) => (roomId) =>
      !spaceRooms.has(roomId) &&
      !mDirects.has(roomId) &&
      roomToParents.has(roomId) &&
      getAllParents(roomToParents, roomId).has(parentId),
    [spaceRooms, mDirects, roomToParents]
  );
};

export const useChildDirectScopeFactory = (
  ct: ClientContext,
  mDirects: Set<string>,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  return useCallback(
    (parentId: string) => (roomId) =>
      !spaceRooms.has(roomId) && mDirects.has(roomId) && roomToParents.get(roomId)?.has(parentId),
    [spaceRooms, mDirects, roomToParents]
  );
};

export const useRecursiveChildDirectScopeFactory = (
  ct: ClientContext,
  mDirects: Set<string>,
  roomToParents: RoomToParents
): SpaceChildSelectorFactory => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  return useCallback(
    (parentId: string) => (roomId) =>
      !spaceRooms.has(roomId) &&
      mDirects.has(roomId) &&
      roomToParents.has(roomId) &&
      getAllParents(roomToParents, roomId).has(parentId),
    [spaceRooms, mDirects, roomToParents]
  );
};

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

export const useSpacesChildren = (
  roomsAtom: RoomsAtom,
  spaces: string[],
  selectorFactory: SpaceChildSelectorFactory
) => {
  const recursiveChildRoomSelector = useMemo(() => {
    const selector: RoomSelector = (roomId) =>
      spaces.some((spaceId) => selectorFactory(spaceId)(roomId));
    return selector;
  }, [selectorFactory, spaces]);
  return useSelectedRooms(roomsAtom, recursiveChildRoomSelector);
};

export const useSpaces = (ct: ClientContext, roomsAtom: RoomsAtom) => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  const selector: RoomSelector = useCallback((roomId) => spaceRooms.has(roomId), [spaceRooms]);
  return useSelectedRooms(roomsAtom, selector);
};

export const useOrphanSpaces = (
  ct: ClientContext,
  roomsAtom: RoomsAtom,
  roomToParents: RoomToParents
) => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  const selector: RoomSelector = useCallback(
    (roomId) => spaceRooms.has(roomId) && !roomToParents.has(roomId),
    [spaceRooms, roomToParents]
  );
  return useSelectedRooms(roomsAtom, selector);
};

export const useRooms = (ct: ClientContext, roomsAtom: RoomsAtom, mDirects: Set<string>) => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  const selector: RoomSelector = useCallback(
    (roomId: string) => !spaceRooms.has(roomId) && !mDirects.has(roomId),
    [spaceRooms, mDirects]
  );
  return useSelectedRooms(roomsAtom, selector);
};

export const useOrphanRooms = (
  ct: ClientContext,
  roomsAtom: RoomsAtom,
  mDirects: Set<string>,
  roomToParents: RoomToParents
) => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  const selector: RoomSelector = useCallback(
    (roomId) => !spaceRooms.has(roomId) && !mDirects.has(roomId) && !roomToParents.has(roomId),
    [spaceRooms, mDirects, roomToParents]
  );
  return useSelectedRooms(roomsAtom, selector);
};

export const useDirects = (ct: ClientContext, roomsAtom: RoomsAtom, mDirects: Set<string>) => {
  const spaceRooms = useObservableValue(ct.spaceRooms);

  const selector: RoomSelector = useCallback(
    (roomId) => !spaceRooms.has(roomId) && mDirects.has(roomId),
    [mDirects, spaceRooms]
  );
  return useSelectedRooms(roomsAtom, selector);
};
