import { getLocalStorageItem, setLocalStorageItem } from './localStorage';

export const CLIENT_SESSIONS_STORE_KEY = 'client-sessions';

export type Session = {
  baseUrl: string;
  userId: string;
  deviceId: string;
  accessToken: string;
  expiresInMs?: number;
  refreshToken?: string;
  fallbackSdkStores?: boolean;
};

export type Sessions = Session[];
export type SessionStoreName = {
  client: string;
  crypto: string;
};

/**
 * Migration code for old session
 */
const FALLBACK_CRYPTO_STORE_NAME = 'matrix-js-sdk';
export const FALLBACK_SYNC_STORE_NAME_FULL = 'matrix-js-sdk::web-sync-store';

export function setFallbackSession(
  accessToken: string,
  deviceId: string,
  userId: string,
  baseUrl: string
) {
  localStorage.setItem('cinny_access_token', accessToken);
  localStorage.setItem('cinny_device_id', deviceId);
  localStorage.setItem('cinny_user_id', userId);
  localStorage.setItem('cinny_hs_base_url', baseUrl);
}
export const removeFallbackSession = () => {
  localStorage.removeItem('cinny_hs_base_url');
  localStorage.removeItem('cinny_user_id');
  localStorage.removeItem('cinny_device_id');
  localStorage.removeItem('cinny_access_token');
};
export const getFallbackSession = (): Session | undefined => {
  const baseUrl = localStorage.getItem('cinny_hs_base_url');
  const userId = localStorage.getItem('cinny_user_id');
  const deviceId = localStorage.getItem('cinny_device_id');
  const accessToken = localStorage.getItem('cinny_access_token');

  if (baseUrl && userId && deviceId && accessToken) {
    const session: Session = {
      baseUrl,
      userId,
      deviceId,
      accessToken,
      fallbackSdkStores: true,
    };

    return session;
  }

  return undefined;
};
/**
 * End of migration code for old session
 */

export const getSessionStoreName = (session: Session): SessionStoreName => {
  if (session.fallbackSdkStores) {
    // if session is recovered from fallback
    // reuse the current crypto store.
    // old sdk uses the same sdk/idb as new one.
    return {
      client: `client${session.userId}`,
      crypto: FALLBACK_CRYPTO_STORE_NAME,
    };
  }

  return {
    client: `client${session.userId}`,
    crypto: `crypto${session.userId}`,
  };
};

export const userHasSession = (userId: string): boolean => {
  const sessions = getLocalStorageItem<Sessions>(CLIENT_SESSIONS_STORE_KEY, []);

  return sessions.some((s) => s.userId === userId);
};

export const removeSession = (session: Session): void => {
  const sessions = getLocalStorageItem<Sessions>(CLIENT_SESSIONS_STORE_KEY, []);

  const newSessions = sessions.filter((s) => s.userId === session.userId);

  setLocalStorageItem(CLIENT_SESSIONS_STORE_KEY, newSessions);
};
