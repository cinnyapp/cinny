// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useClient } from '../useClient';
import { useObservableValue } from '../useObservableValue';

export const useRoomTopic = (roomId: string): string | undefined => {
  const ct = useClient();
  const roomToTopic = useObservableValue(ct.roomToTopic);

  return roomToTopic.get(roomId);
};
