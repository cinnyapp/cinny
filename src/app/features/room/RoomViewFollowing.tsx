// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React from 'react';
import { useClient } from '../../hooks/useClient';
import { useObservableValue } from '../../hooks/useObservableValue';
import { useRoom } from '../../hooks/useRoom';
import { FollowingMembers } from './components';

export function RoomViewFollowing() {
  const ct = useClient();
  const roomId = useRoom();

  const roomToLatestEvent = useObservableValue(ct.roomToLatestEvent);
  const latestEvent = roomToLatestEvent.get(roomId);
  const eventId = latestEvent?.event_id;

  return <FollowingMembers eventId={eventId} />;
}
