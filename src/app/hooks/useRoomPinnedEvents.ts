/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useMemo } from 'react';
import { StateEventType } from '../../types/matrix/room';
import { useRoomStateEvent } from './storage/useRoomStateEvent';

export const useRoomPinnedEvents = (roomId: string): string[] => {
  const pinEventResult = useRoomStateEvent(roomId, StateEventType.RoomPinnedEvents, '');
  const pinEvent = pinEventResult.value;
  const events = useMemo(() => {
    const { content } = pinEvent?.event ?? {};
    if (content && 'pinned' in content && Array.isArray(content.pinned)) {
      return content.pinned;
    }
    return [];
  }, [pinEvent]);

  return events;
};
