/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';

import initMatrix from '../../client/initMatrix';

export function useAccountData(eventType) {
  const mx = initMatrix.matrixClient;
  const [event, setEvent] = useState(mx.getAccountData(eventType));

  useEffect(() => {
    const handleChange = (mEvent) => {
      if (mEvent.getType() !== eventType) return;
      setEvent(mEvent);
    };
    mx.on('accountData', handleChange);
    return () => {
      mx.removeListener('accountData', handleChange);
    };
  }, [eventType]);

  return event;
}
