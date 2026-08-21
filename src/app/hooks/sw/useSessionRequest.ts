import { useEffect } from 'react';
import { Session } from '../../../client/sessions';

const getServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker;
  }
  return undefined;
};

export const useSessionRequest = (session?: Session) => {
  useEffect(() => {
    const handleSWMessages = (ev: MessageEvent<any>) => {
      if (!session) return;

      const { type, id } = ev.data ?? {};

      if (type === 'session-request') {
        getServiceWorker()?.controller?.postMessage({
          type: 'session-request',
          id,
          baseUrl: session.baseUrl,
          accessToken: session.accessToken,
        });
        // sendSessionToSW();
      }
    };

    getServiceWorker()?.addEventListener('message', handleSWMessages);
    return () => {
      getServiceWorker()?.removeEventListener('message', handleSWMessages);
    };
  }, [session]);
};
