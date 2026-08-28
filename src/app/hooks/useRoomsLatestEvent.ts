import { useCallback, useEffect, useState } from 'react';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { useClient } from './useClient';

const getLatestEvent = (
  rooms: string[],
  roomToLatestEvent: Map<string, MessageEventWithoutRoomId>
) => {
  const rToE = new Map<string, MessageEventWithoutRoomId>();

  rooms.forEach((roomId) => {
    const event = roomToLatestEvent.get(roomId);
    if (event) {
      rToE.set(roomId, event);
    }
  });

  return rToE;
};

export const useRoomsLatestEvent = (rooms: string[]) => {
  const ct = useClient();

  const [roomToLatestEvent, setRoomToLatestEvent] = useState(() =>
    getLatestEvent(rooms, ct.roomToLatestEvent.read)
  );

  const updateRoomToLatestEvent = useCallback((next: Map<string, MessageEventWithoutRoomId>) => {
    setRoomToLatestEvent((current) => {
      const hasChanged =
        current.size !== next.size ||
        Array.from(next.entries()).some(
          ([roomId, nextEvent]) => current.get(roomId)?.event_id !== nextEvent.event_id
        );

      return hasChanged ? next : current;
    });
  }, []);

  useEffect(() => {
    const handleLatestEvent = () => {
      updateRoomToLatestEvent(getLatestEvent(rooms, ct.roomToLatestEvent.read));
    };

    updateRoomToLatestEvent(getLatestEvent(rooms, ct.roomToLatestEvent.read));

    const unsubscribe = ct.roomToLatestEvent.subscribe(handleLatestEvent);
    return () => {
      unsubscribe();
    };
  }, [ct, rooms, updateRoomToLatestEvent]);

  return roomToLatestEvent;
};
