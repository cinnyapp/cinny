import { useCallback } from 'react';
import { EventTimelineSet, Room } from 'matrix-js-sdk';
import { AsyncState, useAsyncCallbackValue } from './useAsyncCallback';

export const useRoomMyThreads = (room: Room): AsyncState<EventTimelineSet, Error> => {
  const [threadsState] = useAsyncCallbackValue<EventTimelineSet, Error>(
    useCallback(async () => {
      await room.createThreadsTimelineSets();
      await room.fetchRoomThreads();

      const timelineSet = room.threadsTimelineSets[0];
      if (timelineSet === undefined) {
        throw new Error('Failed to fetch My Threads!');
      }
      return timelineSet;
    }, [room])
  );

  return threadsState;
};
