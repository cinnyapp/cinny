import { MatrixClient } from 'matrix-js-sdk';
import { allInvitesAtom, useBindAllInvitesAtom } from '../inviteList';
import { allRoomsAtom, useBindAllRoomsAtom } from '../roomList';
import { mDirectAtom, useBindMDirectAtom } from '../mDirectList';
import { muteChangesAtom, mutedRoomsAtom, useBindMutedRoomsAtom } from '../mutedRoomList';
import { roomToUnreadAtom, useBindRoomToUnreadAtom } from '../roomToUnread';
import { roomToParentsAtom, useBindRoomToParentsAtom } from '../roomToParents';

export const useBindAtoms = (mx: MatrixClient) => {
  useBindMDirectAtom(mx, mDirectAtom);
  useBindAllInvitesAtom(mx, allInvitesAtom);
  useBindAllRoomsAtom(mx, allRoomsAtom);
  useBindRoomToParentsAtom(mx, roomToParentsAtom);
  useBindMutedRoomsAtom(mx, mutedRoomsAtom);
  useBindRoomToUnreadAtom(mx, roomToUnreadAtom, muteChangesAtom);
};
