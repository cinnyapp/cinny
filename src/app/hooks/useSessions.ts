/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

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
