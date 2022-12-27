import { SetStateAction } from 'jotai';
import { ClientEvent, MatrixClient, Room, RoomEvent } from 'matrix-js-sdk';
import { Membership } from '../../types/matrix/room';
import { disposable } from '../utils/disposable';

export const atomRoomsWithMemberships = disposable(
  (
    setAtom: (update: SetStateAction<string[]>) => void,
    mx: MatrixClient,
    memberships: Membership[]
  ) => {
    const satisfyMembership = (room: Room): boolean =>
      !!memberships.find((membership) => membership === room.getMyMembership());

    setAtom(
      mx
        .getRooms()
        .filter(satisfyMembership)
        .map((room) => room.roomId)
    );

    const updateAtom = (type: 'PUT' | 'DELETE', roomId: string) => {
      setAtom((ids) => {
        const newIds = ids.filter((id) => id !== roomId);
        if (type === 'PUT') newIds.push(roomId);
        return newIds;
      });
    };

    const handleAddRoom = (room: Room) => {
      if (satisfyMembership(room)) {
        updateAtom('PUT', room.roomId);
      }
    };

    const handleMembershipChange = (room: Room) => {
      if (!satisfyMembership(room)) {
        updateAtom('DELETE', room.roomId);
      }
    };

    const handleDeleteRoom = (roomId: string) => {
      updateAtom('DELETE', roomId);
    };

    mx.on(ClientEvent.Room, handleAddRoom);
    mx.on(RoomEvent.MyMembership, handleMembershipChange);
    mx.on(ClientEvent.DeleteRoom, handleDeleteRoom);
    return () => {
      mx.removeListener(ClientEvent.Room, handleAddRoom);
      mx.removeListener(RoomEvent.MyMembership, handleMembershipChange);
      mx.removeListener(ClientEvent.DeleteRoom, handleDeleteRoom);
    };
  }
);
