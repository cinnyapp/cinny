// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { getAllParents } from '../utils/room';
import { useAllJoinedRoomsSet } from './useAllJoinedRoomsSet';
import { roomToParentsAtom } from '../state/room/roomToParents';

export const useImagePackRooms = (roomId: string): string[] => {
  const roomToParents = useAtomValue(roomToParentsAtom);
  const allJoinedRooms = useAllJoinedRoomsSet();

  const imagePackRooms: string[] = useMemo(() => {
    const allParentSpaces = [roomId].concat(Array.from(getAllParents(roomToParents, roomId)));
    return allParentSpaces.reduce<string[]>((list, rId) => {
      if (allJoinedRooms.has(rId)) list.push(rId);
      return list;
    }, []);
  }, [roomId, roomToParents, allJoinedRooms]);

  return imagePackRooms;
};
