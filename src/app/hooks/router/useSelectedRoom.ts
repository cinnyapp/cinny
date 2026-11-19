/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useParams } from 'react-router-dom';
import { isRoomAlias } from '../../utils/matrix';
import { useClient } from '../useClient';

export const useSelectedRoom = (): string | undefined => {
  const ct = useClient();

  const { roomIdOrAlias } = useParams();

  if (roomIdOrAlias && isRoomAlias(roomIdOrAlias)) {
    return ct.rooms.join.read.find((roomId) => ct.roomToAlias.read.get(roomId) === roomIdOrAlias);
  }

  return roomIdOrAlias;
};
