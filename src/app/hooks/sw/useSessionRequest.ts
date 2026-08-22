import { useEffect } from 'react';
import { Session } from '../../../client/sessions';

const getServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker;
  }
  return undefined;
};

export const useSessionRequest = (sessions: Session[], userId?: string) => {
  useEffect(() => {
    const userSession = sessions.find((s) => s.userId === userId);

    const handleSWMessages = (ev: MessageEvent<any>) => {
      const { type, id, origin } = ev.data ?? {};

      const session =
        userSession && userSession.baseUrl.startsWith(origin)
          ? userSession
          : sessions.find((s) => s.baseUrl.startsWith(origin));

      if (!session) return;

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
  }, [sessions, userId]);
};
