// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { isRoomAlias } from '../utils/matrix';
import { useClient } from './useClient';

export const useJoinedRoomId = (allRooms: string[], roomIdOrAlias: string): string | undefined => {
  const ct = useClient();

  const roomId = isRoomAlias(roomIdOrAlias)
    ? ct.rooms.join.read.find((rId) => ct.roomToAlias.read.get(rId) === roomIdOrAlias)
    : roomIdOrAlias;

  if (roomId && allRooms.includes(roomId)) return roomId;

  return undefined;
};
