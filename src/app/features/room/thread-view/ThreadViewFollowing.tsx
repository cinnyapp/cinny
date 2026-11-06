/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React from 'react';
import { ThreadTimeline } from '../../../../client/room/ThreadTimeline';
import { useObservableValue } from '../../../hooks/useObservableValue';
import { FollowingMembers, FollowingMembersPlaceholder } from '../components';

export function ThreadViewFollowing({ threadTimeline }: { threadTimeline: ThreadTimeline }) {
  const meta = useObservableValue(threadTimeline.meta);
  const eventId = meta?.latestReplyEvent?.event_id;

  return eventId ? (
    <FollowingMembers threadId={threadTimeline.threadId} eventId={eventId} />
  ) : (
    <FollowingMembersPlaceholder />
  );
}
