import produce from 'immer';
import { atom } from 'jotai';
import { ClientEvent, MatrixEvent, Room, RoomEvent, RoomStateEvent } from 'matrix-js-sdk';
import { mx } from '../../client/mx';
import { Membership, RoomToParents, StateEvent } from '../../types/matrix/room';
import {
  getRoomToParents,
  getSpaceChildren,
  isSpace,
  isValidChild,
  mapParentWithChildren,
} from '../utils/room';

export const roomToParentsAtom = atom<RoomToParents>(new Map());
roomToParentsAtom.onMount = (setAtom) => {
  setAtom(getRoomToParents(mx()));

  const deleteFromAtom = (roomId: string) => {
    setAtom(
      produce((roomToParents) => {
        const noParentRooms: string[] = [];
        roomToParents.delete(roomId);
        roomToParents.forEach((parents, child) => {
          parents.delete(roomId);
          if (parents.size === 0) noParentRooms.push(child);
        });
        noParentRooms.forEach((room) => roomToParents.delete(room));
        return roomToParents;
      })
    );
  };

  const addToAtom = (parent: string, children: string[]) => {
    setAtom(
      produce((roomToParents) => {
        mapParentWithChildren(roomToParents, parent, children);
        return roomToParents;
      })
    );
  };

  const handleAddRoom = (room: Room) => {
    if (isSpace(room) && room.getMyMembership() !== Membership.Invite) {
      addToAtom(room.roomId, getSpaceChildren(room));
    }
  };

  const handleMembershipChange = (room: Room, membership: string) => {
    if (isSpace(room) && membership === Membership.Join) {
      addToAtom(room.roomId, getSpaceChildren(room));
    }
  };

  const handleStateChange = (mEvent: MatrixEvent) => {
    if (mEvent.getType() === StateEvent.SpaceChild) {
      const childId = mEvent.getStateKey();
      const roomId = mEvent.getRoomId();
      if (childId && roomId) {
        if (isValidChild(mEvent)) addToAtom(roomId, [childId]);
        else deleteFromAtom(childId);
      }
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    deleteFromAtom(roomId);
  };

  mx().on(ClientEvent.Room, handleAddRoom);
  mx().on(RoomEvent.MyMembership, handleMembershipChange);
  mx().on(RoomStateEvent.Events, handleStateChange);
  mx().on(ClientEvent.DeleteRoom, handleDeleteRoom);
  return () => {
    mx().removeListener(ClientEvent.Room, handleAddRoom);
    mx().removeListener(RoomEvent.MyMembership, handleMembershipChange);
    mx().removeListener(RoomStateEvent.Events, handleStateChange);
    mx().removeListener(ClientEvent.DeleteRoom, handleDeleteRoom);
  };
};
