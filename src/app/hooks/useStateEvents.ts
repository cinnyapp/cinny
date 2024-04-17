import { useCallback, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import { StateEvent } from '../../types/matrix/room';
import { useStateEventCallback } from './useStateEventCallback';
import { getStateEvents } from '../utils/room';

export const useStateEvents = (room: Room, eventType: StateEvent) => {
  const [stateEvents, setStateEvents] = useState(() => getStateEvents(room, eventType));

  useStateEventCallback(
    room.client,
    useCallback(
      (event) => {
        if (event.getRoomId() === room.roomId && event.getType() === eventType) {
          setStateEvents(getStateEvents(room, eventType));
        }
      },
      [room, eventType]
    )
  );

  return stateEvents;
};
