/* eslint-disable import/prefer-default-export */
import { useEffect } from 'react';

import initMatrix from '../../client/initMatrix';

import { useForceUpdate } from './useForceUpdate';

export function useRoomStateUpdate(roomId) {
  const [, forceUpdate] = useForceUpdate();
  const mx = initMatrix.matrixClient;

  useEffect(() => {
    const handleStateEvent = (event) => {
      if (event.getRoomId() !== roomId) return;
      forceUpdate();
    };

    mx.on('RoomState.events', handleStateEvent);
    return () => {
      mx.removeListener('RoomState.events', handleStateEvent);
    };
  }, [roomId]);
}
