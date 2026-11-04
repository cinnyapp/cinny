/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useMemo } from 'react';
import { useClient } from './useClient';
import { useObservableValue } from './useObservableValue';

export const useDirectUsers = (): string[] => {
  const ct = useClient();
  const roomToSummary = useObservableValue(ct.roomToSummary);

  const users = useMemo(() => {
    const heroes = Array.from(roomToSummary.values()).flatMap(
      (summary) => summary['m.heroes'] ?? []
    );

    return Array.from(new Set(heroes));
  }, [roomToSummary]);

  return users;
};
