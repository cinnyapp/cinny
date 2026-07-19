import { allInvitesAtom, useBindAllInvitesAtom } from '../room-list/inviteList';
import { allRoomsAtom, useBindAllRoomsAtom } from '../room-list/roomList';
import { mDirectAtom, useBindMDirectAtom } from '../mDirectList';
import { roomToParentsAtom, useBindRoomToParentsAtom } from '../room/roomToParents';
import { roomIdToTypingMembersAtom, useBindRoomIdToTypingMembersAtom } from '../typingMembers';
import {
  roomToNotificationsAtom,
  useBindRoomToNotificationsAtom,
} from '../room/roomToNotifications';
import { ClientContext } from '../../../client/context';
import { unreadRoomsAtom, useBindUnreadRoomsAtom } from '../room/roomToUnread';

export const useBindAtoms = (ct: ClientContext) => {
  useBindMDirectAtom(ct, mDirectAtom);
  useBindAllInvitesAtom(ct, allInvitesAtom);
  useBindAllRoomsAtom(ct, allRoomsAtom);
  useBindRoomToParentsAtom(ct, roomToParentsAtom);
  useBindRoomToNotificationsAtom(ct, roomToNotificationsAtom);
  useBindUnreadRoomsAtom(ct, unreadRoomsAtom);

  useBindRoomIdToTypingMembersAtom(ct, roomIdToTypingMembersAtom);
};
