/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useMemo } from 'react';
import { Presence } from 'neurone/lib/api/types';
import { useClient } from './useClient';
import { useObservableValuePromise } from './useObservableValue';
import { PresenceObject } from '../../client/storage/collections';

export type UserPresence = {
  presence: Presence;
  status?: string;
  active: boolean;
  lastActiveTs?: number;
};

const getUserPresence = (user: PresenceObject): UserPresence => ({
  presence: user.presence ?? 'offline',
  status: user.content.status_msg ?? undefined,
  active: user.content.currently_active ?? false,
  lastActiveTs: user.content.last_active_ago,
});

export const useUserPresence = (userId: string): UserPresence | undefined => {
  const ct = useClient();
  const presencePromise = useMemo(
    () => ct.storage.presence.observableRead.get(userId),
    [ct, userId]
  );
  const presenceResult = useObservableValuePromise(presencePromise);
  const presenceObj = presenceResult.value;

  return presenceObj ? getUserPresence(presenceObj) : undefined;
};

export const usePresenceLabel = (): Record<Presence, string> =>
  useMemo(
    () => ({
      online: 'Active',
      unavailable: 'Busy',
      offline: 'Away',
    }),
    []
  );
