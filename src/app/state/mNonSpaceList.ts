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
import { Membership, StateEvent } from '../../types/matrix/room';
import { isRoom } from '../utils/room';

export type MNonSpaceAction = {
  type: 'INITIALIZE' | 'UPDATE';
  rooms: Set<string>;
};

const baseMNonSpaceAtom = atom(new Set<string>());
export const mNonSpaceAtom = atom<Set<string>, [MNonSpaceAction], undefined>(
  (get) => get(baseMNonSpaceAtom),
  (get, set, action) => {
    set(baseMNonSpaceAtom, action.rooms);
  }
);

const getMNonSpaces = (mx: MatrixClient): Set<string> =>
  new Set(
    mx
      .getRooms()
      .filter((room) => room.getMyMembership() === Membership.Join && isRoom(room))
      .map((room) => room.roomId)
  );

export const useBindMNonSpaceAtom = (mx: MatrixClient, mNonSpace: typeof mNonSpaceAtom) => {
  const setMNonSpace = useSetAtom(mNonSpace);

  useEffect(() => {
    setMNonSpace({
      type: 'INITIALIZE',
      rooms: getMNonSpaces(mx),
    });

    const updateMNonSpace = () => {
      setMNonSpace({
        type: 'UPDATE',
        rooms: getMNonSpaces(mx),
      });
    };

    const handleAddRoom = (room: Room) => {
      if (room.getMyMembership() === Membership.Join) {
        updateMNonSpace();
      }
    };

    const handleMembershipChange = () => {
      updateMNonSpace();
    };

    const handleStateChange = (event: MatrixEvent) => {
      if (event.getType() === StateEvent.RoomCreate) {
        updateMNonSpace();
      }
    };

    const handleDeleteRoom = () => {
      updateMNonSpace();
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
  }, [mx, setMNonSpace]);
};
