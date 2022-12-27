import { atom } from 'jotai';
import { mx } from '../../client/mx';
import { Membership } from '../../types/matrix/room';
import { isDirectInvite, isRoom, isSpace, isUnsupportedRoom } from '../utils/room';
import { mDirectAtom } from './mDirectList';
import { atomRoomsWithMemberships } from './utils';

export const allInvitesAtom = atom<string[]>([]);
allInvitesAtom.onMount = (setAtom) => atomRoomsWithMemberships(setAtom, mx(), [Membership.Invite]);

export const spaceInvitesAtom = atom((get) =>
  get(allInvitesAtom).filter((roomId) => isSpace(mx().getRoom(roomId)))
);

export const roomInvitesAtom = atom((get) =>
  get(allInvitesAtom).filter(
    (roomId) =>
      isRoom(mx().getRoom(roomId)) &&
      !(get(mDirectAtom).has(roomId) || isDirectInvite(mx().getRoom(roomId), mx().getUserId()))
  )
);

export const directInvitesAtom = atom((get) =>
  get(allInvitesAtom).filter(
    (roomId) =>
      get(mDirectAtom).has(roomId) || isDirectInvite(mx().getRoom(roomId), mx().getUserId())
  )
);

export const unsupportedInvitesAtom = atom((get) =>
  get(allInvitesAtom).filter((roomId) => isUnsupportedRoom(mx().getRoom(roomId)))
);
