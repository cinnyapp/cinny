import { useSetAtom, WritableAtom } from 'jotai';
import { ClientEvent, MatrixClient, Room, RoomEvent } from 'matrix-js-sdk';
import { useEffect } from 'react';
import { Membership } from '../../../types/matrix/room';
import { isReplayActive, onReplayProgress } from '../../../client/staged-replay';

export type RoomsAction =
  | {
      type: 'INITIALIZE';
      rooms: string[];
    }
  | {
      type: 'PUT' | 'DELETE';
      roomId: string;
    };

export const useBindRoomsWithMembershipsAtom = (
  mx: MatrixClient,
  roomsAtom: WritableAtom<string[], [RoomsAction], undefined>,
  memberships: Membership[]
) => {
  const setRoomsAtom = useSetAtom(roomsAtom);

  useEffect(() => {
    const satisfyMembership = (room: Room): boolean =>
      !!memberships.find((membership) => membership === room.getMyMembership());
    const initialize = () =>
      setRoomsAtom({
        type: 'INITIALIZE',
        rooms: mx
          .getRooms()
          .filter(satisfyMembership)
          .map((room) => room.roomId),
      });
    initialize();

    // Staged start-up: rooms stream in by the hundred behind the open app. One
    // rebuild per chunk instead of one PUT (and one list re-render) per room.
    let replayDirty = false;
    const handleAddRoom = (room: Room) => {
      if (isReplayActive()) {
        replayDirty = true;
        return;
      }
      if (satisfyMembership(room)) {
        setRoomsAtom({ type: 'PUT', roomId: room.roomId });
      }
    };
    const unsubscribeReplay = onReplayProgress(mx, () => {
      if (!replayDirty) return;
      replayDirty = false;
      initialize();
    });

    const handleMembershipChange = (room: Room) => {
      // Every PUT recomputes the derived room lists over ALL rooms (isRoom /
      // isSpace read each room's create event): one per replayed room was O(n²)
      // — profiled 2026-10-21 at 3,000 chats: 8 of 12 busy seconds. Per chunk instead.
      if (isReplayActive()) {
        replayDirty = true;
        return;
      }
      if (satisfyMembership(room)) {
        setRoomsAtom({ type: 'PUT', roomId: room.roomId });
      } else {
        setRoomsAtom({ type: 'DELETE', roomId: room.roomId });
      }
    };

    const handleDeleteRoom = (roomId: string) => {
      setRoomsAtom({ type: 'DELETE', roomId });
    };

    mx.on(ClientEvent.Room, handleAddRoom);
    mx.on(RoomEvent.MyMembership, handleMembershipChange);
    mx.on(ClientEvent.DeleteRoom, handleDeleteRoom);
    return () => {
      unsubscribeReplay();
      mx.removeListener(ClientEvent.Room, handleAddRoom);
      mx.removeListener(RoomEvent.MyMembership, handleMembershipChange);
      mx.removeListener(ClientEvent.DeleteRoom, handleDeleteRoom);
    };
  }, [mx, memberships, setRoomsAtom]);
};

export const compareRoomsEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  return a.every((roomId, roomIdIndex) => roomId === b[roomIdIndex]);
};
