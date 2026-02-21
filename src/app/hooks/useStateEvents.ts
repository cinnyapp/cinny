import { useCallback, useMemo } from 'react';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { StateEvent } from '../../types/matrix/room';
import { useMatrixClient } from './useMatrixClient';
import { useForceUpdate } from './useForceUpdate';
import { useStateEventCallback } from './useStateEventCallback';

export const useStateEvents = (rooms: Room[], eventType: StateEvent): number => {
  const mx = useMatrixClient();

  const [updateCount, forceUpdate] = useForceUpdate();

  const relevantRoomIds = useMemo(() => {
    const ids = new Set<string>();
    if (rooms && Array.isArray(rooms)) {
      rooms.forEach((room) => {
        if (room?.roomId) {
          ids.add(room.roomId);
        }
      });
    }
    return ids;
  }, [rooms]);
  const handleEventCallback = useCallback(
    (event: MatrixEvent) => {
      const eventRoomId = event.getRoomId();
      if (eventRoomId && event.getType() === eventType && relevantRoomIds.has(eventRoomId)) {
        forceUpdate();
      }
    },
    [eventType, relevantRoomIds, forceUpdate]
  );
  useStateEventCallback(mx, handleEventCallback);
  return updateCount;
};
