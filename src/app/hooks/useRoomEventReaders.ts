import { Room, RoomEvent, RoomEventHandlerMap } from 'matrix-js-sdk';
import { useEffect, useState } from 'react';

const getEventReaders = (room: Room, evtId?: string) => {
  if (!evtId) return [];

  // if eventId is locally generated
  // we don't have read receipt for it yet
  if (!evtId.startsWith('$')) return [];

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

    const handleLocalEcho: RoomEventHandlerMap[RoomEvent.LocalEchoUpdated] = (
      event,
      r,
      oldEventId
    ) => {
      // update members on local event id replaced
      // with server generated id
      if (r.roomId !== room.roomId || !oldEventId) return;
      if (oldEventId.startsWith('$')) return;
      if (oldEventId !== eventId) return;

      setReaders(getEventReaders(room, event.getId()));
    };

    room.on(RoomEvent.Receipt, handleReceipt);
    room.on(RoomEvent.LocalEchoUpdated, handleLocalEcho);

    return () => {
      room.removeListener(RoomEvent.Receipt, handleReceipt);
      room.removeListener(RoomEvent.LocalEchoUpdated, handleLocalEcho);
    };
  }, [room, eventId]);

  return readers;
};
