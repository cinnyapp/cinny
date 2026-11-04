// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { creatorsSupported } from '../utils/matrix';
import { useObservableValue } from './useObservableValue';
import { useClient } from './useClient';

export const useRoomCreators = (roomId: string): Set<string> | undefined => {
  const ct = useClient();
  const roomToCreators = useObservableValue(ct.roomToCreators);

  if (!creatorsSupported(ct.roomToVersion.read.get(roomId) ?? '1')) {
    return undefined;
  }

  return roomToCreators.get(roomId);
};
