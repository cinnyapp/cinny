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
import { roomToHeroMembersAtom, useBindRoomToHeroMembers } from '../room/roomToHeroMembers';

export const useBindAtoms = (ct: ClientContext) => {
  useBindMDirectAtom(ct, mDirectAtom);
  useBindAllRoomsAtom(ct, allRoomsAtom);
  useBindRoomToParentsAtom(ct, roomToParentsAtom);
  useBindRoomToNotificationsAtom(ct, roomToNotificationsAtom);
  useBindRoomToHeroMembers(ct, roomToHeroMembersAtom);
  useBindUnreadRoomsAtom(ct, unreadRoomsAtom);

  useBindRoomIdToTypingMembersAtom(ct, roomIdToTypingMembersAtom);
};
