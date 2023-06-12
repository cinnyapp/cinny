import { useAtomValue, WritableAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { MatrixClient } from 'matrix-js-sdk';
import { useCallback } from 'react';
import { isRoom, isSpace, isUnsupportedRoom } from '../../utils/room';
import { compareRoomsEqual, RoomsAction } from '../utils';
import { MDirectAction } from '../mDirectList';

export const useSpaces = (mx: MatrixClient, allRoomsAtom: WritableAtom<string[], RoomsAction>) => {
  const selector = useCallback(
    (rooms: string[]) => rooms.filter((roomId) => isSpace(mx.getRoom(roomId))),
    [mx]
  );
  return useAtomValue(selectAtom(allRoomsAtom, selector, compareRoomsEqual));
};

export const useRooms = (
  mx: MatrixClient,
  allRoomsAtom: WritableAtom<string[], RoomsAction>,
  mDirectAtom: WritableAtom<Set<string>, MDirectAction>
) => {
  const mDirects = useAtomValue(mDirectAtom);
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter((roomId) => isRoom(mx.getRoom(roomId)) && !mDirects.has(roomId)),
    [mx, mDirects]
  );
  return useAtomValue(selectAtom(allRoomsAtom, selector, compareRoomsEqual));
};

export const useDirects = (
  mx: MatrixClient,
  allRoomsAtom: WritableAtom<string[], RoomsAction>,
  mDirectAtom: WritableAtom<Set<string>, MDirectAction>
) => {
  const mDirects = useAtomValue(mDirectAtom);
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter((roomId) => isRoom(mx.getRoom(roomId)) && mDirects.has(roomId)),
    [mx, mDirects]
  );
  return useAtomValue(selectAtom(allRoomsAtom, selector, compareRoomsEqual));
};

export const useUnsupportedRooms = (
  mx: MatrixClient,
  allRoomsAtom: WritableAtom<string[], RoomsAction>
) => {
  const selector = useCallback(
    (rooms: string[]) => rooms.filter((roomId) => isUnsupportedRoom(mx.getRoom(roomId))),
    [mx]
  );
  return useAtomValue(selectAtom(allRoomsAtom, selector, compareRoomsEqual));
};
