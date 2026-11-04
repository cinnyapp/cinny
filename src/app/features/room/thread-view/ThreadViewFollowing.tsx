// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React from 'react';
import { ThreadTimeline } from '../../../../client/room/ThreadTimeline';
import { useObservableValue } from '../../../hooks/useObservableValue';
import { FollowingMembers } from '../components';

export function ThreadViewFollowing({ threadTimeline }: { threadTimeline: ThreadTimeline }) {
  const meta = useObservableValue(threadTimeline.meta);

  return <FollowingMembers eventId={meta?.latestReplyEvent?.event_id} />;
}
