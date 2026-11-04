// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { allRoomsAtom } from '../state/room-list/roomList';

export const useAllJoinedRoomsSet = () => {
  const allRooms = useAtomValue(allRoomsAtom);
  const allJoinedRooms = useMemo(() => new Set(allRooms), [allRooms]);

  return allJoinedRooms;
};
