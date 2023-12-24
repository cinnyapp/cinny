import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { MatrixClient } from 'matrix-js-sdk';
import { useCallback } from 'react';
import { isRoom, isSpace, isUnsupportedRoom } from '../../utils/room';
import { compareRoomsEqual } from '../utils';
import { mDirectAtom } from '../mDirectList';
import { allRoomsAtom } from '../roomList';

export const useSpaces = (mx: MatrixClient, roomsAtom: typeof allRoomsAtom) => {
  const selector = useCallback(
    (rooms: string[]) => rooms.filter((roomId) => isSpace(mx.getRoom(roomId))),
    [mx]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useRooms = (
  mx: MatrixClient,
  roomsAtom: typeof allRoomsAtom,
  directAtom: typeof mDirectAtom
) => {
  const mDirects = useAtomValue(directAtom);
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter((roomId) => isRoom(mx.getRoom(roomId)) && !mDirects.has(roomId)),
    [mx, mDirects]
  );
  return useAtomValue(selectAtom(roomsAtom, selector, compareRoomsEqual));
};

export const useDirects = (
  mx: MatrixClient,
  roomsAtom: typeof allRoomsAtom,
  directAtom: typeof mDirectAtom
) => {
  const mDirects = useAtomValue(directAtom);
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
