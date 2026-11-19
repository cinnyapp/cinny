/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { useCallback } from 'react';
import { Chip, Icon, Icons, Spinner, Text } from 'folds';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { scrollToBottom } from '../../../utils/dom';
import { useTimelineView } from '../hooks/useTimeline';

export function JumpToLatestButton({
  getScrollElement,
}: {
  getScrollElement: () => HTMLDivElement | null;
}) {
  const timeline = useTimelineView();

  const [jumpState, jumpToBottom] = useAsyncCallback(
    useCallback(async () => {
      await timeline.jumpToLatest();
      const scrollEl = getScrollElement();
      if (scrollEl) scrollToBottom(scrollEl, 'instant');
    }, [timeline, getScrollElement])
  );

  return (
    <Chip
      variant="SurfaceVariant"
      radii="Pill"
      outlined
      onClick={jumpToBottom}
      before={
        jumpState.status === AsyncStatus.Loading ? (
          <Spinner size="50" variant="Secondary" />
        ) : (
          <Icon size="50" src={Icons.ArrowBottom} />
        )
      }
    >
      <Text size="L400">Jump to Latest</Text>
    </Chip>
  );
}
