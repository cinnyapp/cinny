import { useMemo } from 'react';
import { RoomToUnread, Unread } from '../../../types/matrix/room';

export const useRoomsUnread = (rooms: string[], roomToUnread: RoomToUnread): Unread | undefined =>
  useMemo(() => {
    const unread = rooms.reduce<Unread | undefined>((u, roomId) => {
      const roomUnread = roomToUnread.get(roomId);
      if (!roomUnread) return u;
      const newUnread: Unread = u ?? {
        total: 0,
        highlight: 0,
        from: new Set(),
      };
      newUnread.total += roomUnread.total;
      newUnread.highlight += roomUnread.highlight;
      newUnread.from?.add(roomId);
      return newUnread;
    }, undefined);
    return unread;
  }, [rooms, roomToUnread]);
