import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { MarkedUnreadRooms, markedUnreadAtom } from '../room/markedUnread';

/** `true` when the user explicitly marked this room unread (MSC2867). */
export const useRoomMarkedUnread = (
  roomId: string,
  markedUnreadAtm: typeof markedUnreadAtom = markedUnreadAtom
): boolean => {
  const selector = useCallback(
    (markedUnread: MarkedUnreadRooms) => markedUnread.has(roomId),
    [roomId]
  );
  return useAtomValue(selectAtom(markedUnreadAtm, selector));
};

/**
 * `true` when any of `rooms` is marked unread — for the sidebar badges.
 *
 * Iterates the marked set (normally a handful of rooms) and probes a memoised
 * lookup of the tab's rooms, so it stays cheap even on an account with
 * thousands of rooms.
 */
export const useRoomsMarkedUnread = (
  rooms: string[],
  markedUnreadAtm: typeof markedUnreadAtom = markedUnreadAtom
): boolean => {
  const roomSet = useMemo(() => new Set(rooms), [rooms]);
  const selector = useCallback(
    (markedUnread: MarkedUnreadRooms) => {
      let found = false;
      markedUnread.forEach((roomId) => {
        if (roomSet.has(roomId)) found = true;
      });
      return found;
    },
    [roomSet]
  );
  return useAtomValue(selectAtom(markedUnreadAtm, selector));
};
