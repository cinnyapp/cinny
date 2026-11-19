/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { allRoomsAtom } from '../state/room-list/roomList';

export const useAllJoinedRoomsSet = () => {
  const allRooms = useAtomValue(allRoomsAtom);
  const allJoinedRooms = useMemo(() => new Set(allRooms), [allRooms]);

  return allJoinedRooms;
};
