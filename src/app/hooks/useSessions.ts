import { useAtomValue } from 'jotai';
import { createContext, useContext } from 'react';
import { sessionsAtom } from '../state/sessions';
import { Session } from '../../client/sessions';

export const useSessions = () => {
  const sessions = useAtomValue(sessionsAtom);

  return sessions;
};

const SessionContext = createContext<Session | null>(null);
export const SessionContextProvider = SessionContext.Provider;

export const useSession = () => {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error('Session is not provided!');
  }

  return session;
};
