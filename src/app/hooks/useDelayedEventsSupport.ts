import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { useMatrixClient } from './useMatrixClient';
import { delayedEventsSupportedAtom } from '../state/scheduledMessages';
import { supportsDelayedEvents } from '../utils/delayedEvents';

export function useDelayedEventsSupport(): void {
  const mx = useMatrixClient();
  const setSupported = useSetAtom(delayedEventsSupportedAtom);

  useEffect(() => {
    let cancelled = false;
    supportsDelayedEvents(mx).then((supported) => {
      if (cancelled) return;
      setSupported(supported);
    });
    return () => {
      cancelled = true;
    };
  }, [mx, setSupported]);
}
