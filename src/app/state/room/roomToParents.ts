import produce from 'immer';
import { atom, useSetAtom } from 'jotai';
import {
  ClientEvent,
  MatrixClient,
  MatrixEvent,
  Room,
  RoomEvent,
  RoomStateEvent,
} from 'matrix-js-sdk';
import { useEffect } from 'react';
import { Membership, RoomToParents, StateEvent } from '../../../types/matrix/room';
import {
  getRoomToParents,
  getSpaceChildren,
  isSpace,
  isValidChild,
  mapParentWithChildren,
} from '../../utils/room';

export type RoomToParentsAction =
  | {
      type: 'INITIALIZE';
      roomToParents: RoomToParents;
    }
  | {
      type: 'PUT';
      parent: string;
      children: string[];
    }
  | {
      type: 'DELETE';
      roomId: string;
    };

const baseRoomToParents = atom<RoomToParents>(new Map());
export const roomToParentsAtom = atom<RoomToParents, [RoomToParentsAction], undefined>(
  (get) => get(baseRoomToParents),
  (get, set, action) => {
    if (action.type === 'INITIALIZE') {
      set(baseRoomToParents, action.roomToParents);
      return;
    }
    if (action.type === 'PUT') {
      set(
        baseRoomToParents,
        produce(get(baseRoomToParents), (draftRoomToParents) => {
          mapParentWithChildren(draftRoomToParents, action.parent, action.children);
        })
      );
      return;
    }
    if (action.type === 'DELETE') {
      set(
        baseRoomToParents,
        produce(get(baseRoomToParents), (draftRoomToParents) => {
          const noParentRooms: string[] = [];
          draftRoomToParents.delete(action.roomId);
          draftRoomToParents.forEach((parents, child) => {
            parents.delete(action.roomId);
            if (parents.size === 0) noParentRooms.push(child);
          });
          noParentRooms.forEach((room) => draftRoomToParents.delete(room));
        })
      );
    }
  }
);

export const useBindRoomToParentsAtom = (
  mx: MatrixClient,
  roomToParents: typeof roomToParentsAtom
) => {
  const setRoomToParents = useSetAtom(roomToParents);

  useEffect(() => {
    setRoomToParents({ type: 'INITIALIZE', roomToParents: getRoomToParents(mx) });

    const handleAddRoom = (room: Room) => {
      if (isSpace(room) && room.getMyMembership() !== Membership.Invite) {
        setRoomToParents({ type: 'PUT', parent: room.roomId, children: getSpaceChildren(room) });
      }
    };

    const handleMembershipChange = (room: Room, membership: string) => {
      if (isSpace(room) && room.getMyMembership() === Membership.Leave) {
        setRoomToParents({ type: 'DELETE', roomId: room.roomId });
        return;
      }
      if (isSpace(room) && membership === Membership.Join) {
        setRoomToParents({ type: 'PUT', parent: room.roomId, children: getSpaceChildren(room) });
      }
    };

    const handleStateChange = (mEvent: MatrixEvent) => {
      if (mEvent.getType() === StateEvent.SpaceChild) {
        const childId = mEvent.getStateKey();
        const roomId = mEvent.getRoomId();
        if (childId && roomId) {
          if (isValidChild(mEvent)) {
            setRoomToParents({ type: 'PUT', parent: roomId, children: [childId] });
          } else {
            setRoomToParents({ type: 'DELETE', roomId: childId });
          }
        }
      }
    };

    const handleDeleteRoom = (roomId: string) => {
      setRoomToParents({ type: 'DELETE', roomId });
    };

    mx.on(ClientEvent.Room, handleAddRoom);
    mx.on(RoomEvent.MyMembership, handleMembershipChange);
    mx.on(RoomStateEvent.Events, handleStateChange);
    mx.on(ClientEvent.DeleteRoom, handleDeleteRoom);
    return () => {
      mx.removeListener(ClientEvent.Room, handleAddRoom);
      mx.removeListener(RoomEvent.MyMembership, handleMembershipChange);
      mx.removeListener(RoomStateEvent.Events, handleStateChange);
      mx.removeListener(ClientEvent.DeleteRoom, handleDeleteRoom);
    };
  }, [mx, setRoomToParents]);
};
