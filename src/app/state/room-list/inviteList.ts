import { atom, WritableAtom } from 'jotai';
import { MatrixClient } from 'matrix-js-sdk';
import { useMemo } from 'react';
import { Membership } from '../../../types/matrix/room';
import { RoomsAction, useBindRoomsWithMembershipsAtom } from './utils';

const baseRoomsAtom = atom<string[]>([]);
export const allInvitesAtom = atom<string[], [RoomsAction], undefined>(
  (get) => get(baseRoomsAtom),
  (get, set, action) => {
    if (action.type === 'INITIALIZE') {
      set(baseRoomsAtom, action.rooms);
      return;
    }
    set(baseRoomsAtom, (ids) => {
      const newIds = ids.filter((id) => id !== action.roomId);
      if (action.type === 'PUT') newIds.push(action.roomId);
      return newIds;
    });
  }
);

export const useBindAllInvitesAtom = (
  mx: MatrixClient,
  allRooms: WritableAtom<string[], [RoomsAction], undefined>
) => {
  useBindRoomsWithMembershipsAtom(
    mx,
    allRooms,
    useMemo(() => [Membership.Invite], [])
  );
};
