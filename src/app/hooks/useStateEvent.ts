import { Room } from 'matrix-js-sdk';
import { useCallback, useState } from 'react';
import { useStateEventCallback } from './useStateEventCallback';
import { getStateEvent } from '../utils/room';
import { StateEvent } from '../../types/matrix/room';

export const useStateEvent = (room: Room, eventType: StateEvent, stateKey = '') => {
  const [stateEvent, setStateEvent] = useState(() => getStateEvent(room, eventType, stateKey));

  useStateEventCallback(
    room.client,
    useCallback(
      (event) => {
        if (
          event.getRoomId() === room.roomId &&
          event.getType() === eventType &&
          event.getStateKey() === stateKey
        ) {
          setStateEvent(getStateEvent(room, eventType, stateKey));
        }
      },
      [room, eventType, stateKey]
    )
  );

  return stateEvent;
};
