import { Room, RoomEvent, RoomEventHandlerMap } from 'matrix-js-sdk';
import { useEffect, useState } from 'react';

const getEventReaders = (room: Room, evtId?: string) => {
  if (!evtId) return [];
  const liveEvents = room.getLiveTimeline().getEvents();
  const userIds: string[] = [];

  for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
    userIds.splice(userIds.length, 0, ...room.getUsersReadUpTo(liveEvents[i]));
    if (liveEvents[i].getId() === evtId) break;
  }

  return [...new Set(userIds)];
};

export const useRoomEventReaders = (room: Room, eventId?: string): string[] => {
  const [readers, setReaders] = useState<string[]>(() => getEventReaders(room, eventId));

  useEffect(() => {
    setReaders(getEventReaders(room, eventId));

    const handleReceipt: RoomEventHandlerMap[RoomEvent.Receipt] = (event, r) => {
      if (r.roomId !== room.roomId) return;
      setReaders(getEventReaders(room, eventId));
    };

    room.on(RoomEvent.Receipt, handleReceipt);
    return () => {
      room.removeListener(RoomEvent.Receipt, handleReceipt);
    };
  }, [room, eventId]);

  return readers;
};
