import { useAtomValue, WritableAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { MatrixClient } from 'matrix-js-sdk';
import { useCallback } from 'react';
import { isDirectInvite, isRoom, isSpace, isUnsupportedRoom } from '../../utils/room';
import { compareRoomsEqual, RoomsAction } from '../utils';
import { MDirectAction } from '../mDirectList';

export const useSpaceInvites = (
  mx: MatrixClient,
  allInvitesAtom: WritableAtom<string[], RoomsAction>
) => {
  const selector = useCallback(
    (rooms: string[]) => rooms.filter((roomId) => isSpace(mx.getRoom(roomId))),
    [mx]
  );
  return useAtomValue(selectAtom(allInvitesAtom, selector, compareRoomsEqual));
};

export const useRoomInvites = (
  mx: MatrixClient,
  allInvitesAtom: WritableAtom<string[], RoomsAction>,
  mDirectAtom: WritableAtom<Set<string>, MDirectAction>
) => {
  const mDirects = useAtomValue(mDirectAtom);
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter(
        (roomId) =>
          isRoom(mx.getRoom(roomId)) &&
          !(mDirects.has(roomId) || isDirectInvite(mx.getRoom(roomId), mx.getUserId()))
      ),
    [mx, mDirects]
  );
  return useAtomValue(selectAtom(allInvitesAtom, selector, compareRoomsEqual));
};

export const useDirectInvites = (
  mx: MatrixClient,
  allInvitesAtom: WritableAtom<string[], RoomsAction>,
  mDirectAtom: WritableAtom<Set<string>, MDirectAction>
) => {
  const mDirects = useAtomValue(mDirectAtom);
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter(
        (roomId) => mDirects.has(roomId) || isDirectInvite(mx.getRoom(roomId), mx.getUserId())
      ),
    [mx, mDirects]
  );
  return useAtomValue(selectAtom(allInvitesAtom, selector, compareRoomsEqual));
};

export const useUnsupportedInvites = (
  mx: MatrixClient,
  allInvitesAtom: WritableAtom<string[], RoomsAction>
) => {
  const selector = useCallback(
    (rooms: string[]) => rooms.filter((roomId) => isUnsupportedRoom(mx.getRoom(roomId))),
    [mx]
  );
  return useAtomValue(selectAtom(allInvitesAtom, selector, compareRoomsEqual));
};
