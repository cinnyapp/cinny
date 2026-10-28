import { useEffect, useState } from 'react';
import { Room, RoomStateEvent } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { Membership, StateEvent } from '../../../types/matrix/room';
import { HierarchyRoom, roomsToAutoJoin } from './spaceAutoJoin';

const PAGE_SIZE = 100;
const MAX_PAGES = 5;

// Rooms already tried this page load, so a failed join isn't retried in a loop.
const attempted = new Set<string>();

// Joins every room of the space you're looking at that you may join, so its text and voice
// rooms all show in the sidebar. Rooms you left or were banned from are left alone.
export const useAutoJoinSpaceRooms = (space: Room): void => {
  const mx = useMatrixClient();
  const [childrenChanged, setChildrenChanged] = useState(0);

  useEffect(() => {
    const onState = (event: { getType: () => string; getRoomId: () => string | undefined }) => {
      if (event.getType() === StateEvent.SpaceChild && event.getRoomId() === space.roomId) {
        setChildrenChanged((n) => n + 1);
      }
    };
    mx.on(RoomStateEvent.Events, onState);
    return () => {
      mx.removeListener(RoomStateEvent.Events, onState);
    };
  }, [mx, space.roomId]);

  useEffect(() => {
    let alive = true;
    const skip = (roomId: string) => {
      const membership = mx.getRoom(roomId)?.getMyMembership();
      return (
        attempted.has(roomId) ||
        membership === Membership.Join ||
        membership === Membership.Leave ||
        membership === Membership.Ban
      );
    };

    (async () => {
      const rooms: HierarchyRoom[] = [];
      let from: string | undefined;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await mx.getRoomHierarchy(space.roomId, PAGE_SIZE, undefined, false, from);
        rooms.push(...(res.rooms as HierarchyRoom[]));
        from = res.next_batch;
        if (!from) break;
      }

      // One at a time: a sub-space before the rooms inside it.
      await roomsToAutoJoin(rooms, space.roomId, skip).reduce(
        (previous, { roomId, via }) =>
          previous.then(async () => {
            if (!alive) return;
            attempted.add(roomId);
            await mx.joinRoom(roomId, { viaServers: via }).catch((e: unknown) => {
              // eslint-disable-next-line no-console
              console.warn(`Couldn't auto-join ${roomId}`, e);
            });
          }),
        Promise.resolve()
      );
    })().catch((e: unknown) => {
      // eslint-disable-next-line no-console
      console.warn("Couldn't read the space's rooms", e);
    });

    return () => {
      alive = false;
    };
  }, [mx, space.roomId, childrenChanged]);
};
