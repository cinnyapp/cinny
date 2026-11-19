/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback } from 'react';
import { useClient } from '../useClient';
import { useObservableValue } from '../useObservableValue';

export type GetRoomHeroesCallback = (roomId: string) => string[];

export const useRoomHeroes = (): GetRoomHeroesCallback => {
  const ct = useClient();
  const roomToSummary = useObservableValue(ct.roomToSummary);
  const directRoomToUser = useObservableValue(ct.directRoomToUser);

  const getHeroes: GetRoomHeroesCallback = useCallback(
    (roomId): string[] => {
      const heroes = roomToSummary.get(roomId)?.['m.heroes'];
      if (heroes && heroes.length > 0) return heroes;

      const dmUserId = directRoomToUser.get(roomId);
      return dmUserId ? [dmUserId] : [];
    },
    [roomToSummary, directRoomToUser]
  );
  return getHeroes;
};
