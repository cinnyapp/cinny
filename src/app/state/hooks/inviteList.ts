import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { MatrixClient } from 'matrix-js-sdk';
import { useCallback } from 'react';
import { isDirectInvite, isRoom, isSpace, isUnsupportedRoom } from '../../utils/room';
import { compareRoomsEqual } from '../room-list/utils';
import { allInvitesAtom } from '../room-list/inviteList';

export const useSpaceInvites = (mx: MatrixClient, invitesAtom: typeof allInvitesAtom) => {
  const selector = useCallback(
    (rooms: string[]) => rooms.filter((roomId) => isSpace(mx.getRoom(roomId))),
    [mx]
  );
  return useAtomValue(selectAtom(invitesAtom, selector, compareRoomsEqual));
};

export const useRoomInvites = (
  mx: MatrixClient,
  invitesAtom: typeof allInvitesAtom,
  mDirects: Set<string>
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter(
        (roomId) =>
          isRoom(mx.getRoom(roomId)) &&
          !(mDirects.has(roomId) || isDirectInvite(mx.getRoom(roomId), mx.getUserId()))
      ),
    [mx, mDirects]
  );
  return useAtomValue(selectAtom(invitesAtom, selector, compareRoomsEqual));
};

export const useDirectInvites = (
  mx: MatrixClient,
  invitesAtom: typeof allInvitesAtom,
  mDirects: Set<string>
) => {
  const selector = useCallback(
    (rooms: string[]) =>
      rooms.filter(
        (roomId) => mDirects.has(roomId) || isDirectInvite(mx.getRoom(roomId), mx.getUserId())
      ),
    [mx, mDirects]
  );
  return useAtomValue(selectAtom(invitesAtom, selector, compareRoomsEqual));
};

export const useUnsupportedInvites = (mx: MatrixClient, invitesAtom: typeof allInvitesAtom) => {
  const selector = useCallback(
    (rooms: string[]) => rooms.filter((roomId) => isUnsupportedRoom(mx.getRoom(roomId))),
    [mx]
  );
  return useAtomValue(selectAtom(invitesAtom, selector, compareRoomsEqual));
};
