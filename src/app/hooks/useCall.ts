/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useEffect } from 'react';
import { useClient } from './useClient';
import { CallMember, CallSession } from '../../client/call';
import { useObservableValue } from './useObservableValue';

export const useCallSession = (roomId: string): CallSession => {
  const ct = useClient();

  return ct.callSessions.getSession(roomId);
};

export const useCallMembersChange = (
  session: CallSession,
  callback: (members: CallMember[]) => void
): void => {
  useEffect(() => {
    const unsub = session.members.subscribe(callback);
    return () => {
      unsub();
    };
  }, [session, callback]);
};

export const useCallMembers = (session: CallSession): CallMember[] => {
  const members = useObservableValue(session.members);

  return members;
};
