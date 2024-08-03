import { atom } from 'jotai';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

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
  sync: string;
  crypto: string;
};

/**
 * Migration code for old session
 */
const FALLBACK_STORE_NAME: SessionStoreName = {
  sync: 'web-sync-store',
  crypto: 'crypto-store',
} as const;

const removeFallbackSession = () => {
  localStorage.removeItem('cinny_hs_base_url');
  localStorage.removeItem('cinny_user_id');
  localStorage.removeItem('cinny_device_id');
  localStorage.removeItem('cinny_access_token');
};
const getFallbackSession = (): Session | undefined => {
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
    return FALLBACK_STORE_NAME;
  }

  return {
    sync: `sync${session.userId}`,
    crypto: `crypto${session.userId}`,
  };
};

export const MATRIX_SESSIONS_KEY = 'matrixSessions';
const baseSessionsAtom = atomWithLocalStorage<Sessions>(
  MATRIX_SESSIONS_KEY,
  (key) => {
    const defaultSessions: Sessions = [];
    const sessions = getLocalStorageItem(key, defaultSessions);

    // Before multi account support session was stored
    // as multiple item in local storage.
    // So we need these migration code.
    const fallbackSession = getFallbackSession();
    if (fallbackSession) {
      removeFallbackSession();
      sessions.push(fallbackSession);
      setLocalStorageItem(key, sessions);
    }
    return sessions;
  },
  (key, value) => {
    setLocalStorageItem(key, value);
  }
);

export type SessionsAction =
  | {
      type: 'PUT';
      session: Session;
    }
  | {
      type: 'DELETE';
      session: Session;
    };

export const sessionsAtom = atom<Sessions, [SessionsAction], undefined>(
  (get) => get(baseSessionsAtom),
  (get, set, action) => {
    if (action.type === 'PUT') {
      const sessions = [...get(baseSessionsAtom)];
      const sessionIndex = sessions.findIndex(
        (session) => session.userId === action.session.userId
      );
      if (sessionIndex === -1) {
        sessions.push(action.session);
      } else {
        sessions.splice(sessionIndex, 1, action.session);
      }
      set(baseSessionsAtom, sessions);
      return;
    }
    if (action.type === 'DELETE') {
      const sessions = get(baseSessionsAtom).filter(
        (session) => session.userId !== action.session.userId
      );
      set(baseSessionsAtom, sessions);
    }
  }
);
