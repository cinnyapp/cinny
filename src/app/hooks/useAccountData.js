/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';
import { useMatrixClient } from './useMatrixClient';

export function useAccountData(eventType) {
  const mx = useMatrixClient();
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
  }, [mx, eventType]);

  return event;
}
