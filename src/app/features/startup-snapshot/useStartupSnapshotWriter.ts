import { useEffect, useRef } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { RoomToUnread } from '../../../types/matrix/room';
import { getDirectRoomAvatarUrl } from '../../utils/room';
import {
  buildSnapshot,
  readSnapshot,
  sameSnapshot,
  SNAPSHOT_MAX_ROOMS,
  SnapshotRoom,
  writeSnapshot,
} from './snapshot';

const SAVE_DELAY_MS = 4000;
// Unread counts are read from the jotai store at save time (not subscribed), so
// the chat list does not re-render on every unread change because of this.

/**
 * Keep the startup snapshot (see ./snapshot.ts) in step with the chat list.
 * Saves the top of the list a few seconds after it changes, and when the page is
 * hidden or closed, so the next start can draw it instantly.
 */
export const useStartupSnapshotWriter = (
  mx: MatrixClient,
  sortedRoomIds: string[],
  mDirects: Set<string>,
  getRoomToUnread: () => RoomToUnread,
  isMuted: (roomId: string) => boolean,
  useAuthentication: boolean
) => {
  const latest = useRef<() => void>();

  latest.current = () => {
    const userId = mx.getUserId();
    if (!userId || sortedRoomIds.length === 0) return;
    const roomToUnread = getRoomToUnread();
    const rooms: SnapshotRoom[] = [];
    for (let i = 0; i < sortedRoomIds.length && rooms.length < SNAPSHOT_MAX_ROOMS; i += 1) {
      const roomId = sortedRoomIds[i];
      const room = mx.getRoom(roomId);
      if (room) {
        const dm = mDirects.has(roomId);
        const unread = roomToUnread.get(roomId);
        rooms.push({
          id: roomId,
          name: room.name,
          avatar: dm ? getDirectRoomAvatarUrl(mx, room, 96, useAuthentication) : undefined,
          dm,
          unread: unread?.total,
          highlight: unread?.highlight,
          muted: isMuted(roomId),
        });
      }
    }
    const snap = buildSnapshot(userId, rooms, mx.getRooms().length);
    if (sameSnapshot(readSnapshot(userId), snap)) return;
    writeSnapshot(snap);
  };

  // Throttle, not debounce: right after start the list keeps changing (activity
  // lookups land one by one), and a debounce would never get to save.
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = undefined;
      latest.current?.();
    }, SAVE_DELAY_MS);
  }, [sortedRoomIds, mDirects]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  useEffect(() => {
    const save = () => latest.current?.();
    // unread counts change without the order changing: refresh now and then
    const interval = setInterval(save, 60000);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
};
