import { atom } from 'jotai';
import { mx } from '../../client/mx';
import { Membership } from '../../types/matrix/room';
import { isRoom, isSpace, isUnsupportedRoom } from '../utils/room';
import { mDirectAtom } from './mDirectList';
import { atomRoomsWithMemberships } from './utils';

export const allRoomsAtom = atom<string[]>([]);
allRoomsAtom.onMount = (setAtom) => atomRoomsWithMemberships(setAtom, mx(), [Membership.Join]);

export const spacesAtom = atom((get) =>
  get(allRoomsAtom).filter((roomId) => isSpace(mx().getRoom(roomId)))
);

export const roomsAtom = atom((get) =>
  get(allRoomsAtom).filter(
    (roomId) => isRoom(mx().getRoom(roomId)) && !get(mDirectAtom).has(roomId)
  )
);

export const directsAtom = atom((get) =>
  get(allRoomsAtom).filter((roomId) => isRoom(mx().getRoom(roomId)) && get(mDirectAtom).has(roomId))
);

export const unsupportedRoomsAtom = atom((get) =>
  get(allRoomsAtom).filter((roomId) => isUnsupportedRoom(mx().getRoom(roomId)))
);
