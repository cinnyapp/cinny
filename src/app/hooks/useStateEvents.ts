import { useCallback, useMemo } from 'react';
import { Room } from 'matrix-js-sdk';
import { StateEvent } from '../../types/matrix/room';
import { useForceUpdate } from './useForceUpdate';
import { useStateEventCallback } from './useStateEventCallback';
import { getStateEvents } from '../utils/room';

export const useStateEvents = (room: Room, eventType: StateEvent) => {
  const [updateCount, forceUpdate] = useForceUpdate();

  useStateEventCallback(
    room.client,
    useCallback(
      (event) => {
        if (event.getRoomId() === room.roomId && event.getType() === eventType) {
          forceUpdate();
        }
      },
      [room, eventType, forceUpdate]
    )
  );

  return useMemo(
    () => getStateEvents(room, eventType),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room, eventType, updateCount]
  );
};
