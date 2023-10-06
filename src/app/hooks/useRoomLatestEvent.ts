import { MatrixEvent, Room, RoomEvent, RoomEventHandlerMap } from 'matrix-js-sdk';
import { useEffect, useState } from 'react';

export const useRoomLatestEvent = (room: Room) => {
  const [latestEvent, setLatestEvent] = useState<MatrixEvent>();

  useEffect(() => {
    const getLatestEvent = (): MatrixEvent | undefined => {
      const liveEvents = room.getLiveTimeline().getEvents();
      for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
        const evt = liveEvents[i];
        if (evt) return evt;
      }
      return undefined;
    };

    const handleTimelineEvent: RoomEventHandlerMap[RoomEvent.Timeline] = () => {
      setLatestEvent(getLatestEvent());
    };
    setLatestEvent(getLatestEvent());

    room.on(RoomEvent.Timeline, handleTimelineEvent);
    return () => {
      room.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [room]);

  return latestEvent;
};
