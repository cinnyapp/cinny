import { Session, Sessions } from '../../app/state/sessions';

/*
 * Transition code for moving to the multi-account session storage solution
 */

const getActiveSession = (): Session | null => {
  const sessionsJSON = localStorage.getItem('matrixSessions');
  if (!sessionsJSON) {
    return null;
  }
  try {
    const sessions = JSON.parse(sessionsJSON) as Sessions;
    return sessions[0] || null;
  } catch (e) {
    console.error('Failed to parse matrixSessions from localStorage', e);
    return null;
  }
};

const isAuthenticated = (): boolean => {
  const session = getActiveSession();
  return !!session?.accessToken;
};

const getSecret = () => {
  const session = getActiveSession();
  return {
    accessToken: session?.accessToken,
    deviceId: session?.deviceId,
    userId: session?.userId,
    baseUrl: session?.baseUrl,
  };
};

export { isAuthenticated, getSecret };
