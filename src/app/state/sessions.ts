import { atom } from 'jotai';
import { atomWithLocalStorage } from './utils/atomWithLocalStorage';
import {
  CLIENT_SESSIONS_STORE_KEY,
  getFallbackSession,
  getLastActiveUserId,
  removeFallbackSession,
  Session,
  Sessions,
} from '../../client/sessions';
import { getLocalStorageItem, setLocalStorageItem } from '../../client/localStorage';

const baseSessionsAtom = atomWithLocalStorage<Sessions>(
  CLIENT_SESSIONS_STORE_KEY,
  (key) => {
    const defaultSessions: Sessions = [];
    const sessions = getLocalStorageItem(key, defaultSessions);

    // Before multi account support session was stored
    // as multiple item in local storage.
    // So we need these migration code.
    const fallbackSession = getFallbackSession();
    if (fallbackSession) {
      sessions.push(fallbackSession);
      setLocalStorageItem(key, sessions);
      removeFallbackSession();
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

export const sessionUserIdAtom = atom<string | undefined>(getLastActiveUserId());
