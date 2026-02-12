/* eslint-disable react/destructuring-assignment */
import React, { forwardRef, useMemo } from 'react';
import { EventTimelineSet, Room } from 'matrix-js-sdk';
import { Box, config, Header, Icon, IconButton, Icons, Menu, Scroll, Text, toRem } from 'folds';
import * as css from './ThreadsMenu.css';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { useRoomMyThreads } from '../../../hooks/useRoomThreads';
import { AsyncStatus } from '../../../hooks/useAsyncCallback';
import { getLinkedTimelines, getTimelinesEventsCount } from '../utils';
import { ThreadsTimeline } from './ThreadsTimeline';
import { ThreadsLoading } from './ThreadsLoading';
import { ThreadsError } from './ThreadsError';

const getTimelines = (timelineSet: EventTimelineSet) => {
  const liveTimeline = timelineSet.getLiveTimeline();
  const linkedTimelines = getLinkedTimelines(liveTimeline);

  return linkedTimelines;
};

function NoThreads() {
  return (
    <Box
      className={ContainerColor({ variant: 'SurfaceVariant' })}
      style={{
        marginBottom: config.space.S200,
        padding: `${config.space.S700} ${config.space.S400} ${toRem(60)}`,
        borderRadius: config.radii.R300,
      }}
      grow="Yes"
      direction="Column"
      gap="400"
      justifyContent="Center"
      alignItems="Center"
    >
      <Icon src={Icons.Thread} size="600" />
      <Box style={{ maxWidth: toRem(300) }} direction="Column" gap="200" alignItems="Center">
        <Text size="H4" align="Center">
          No Threads Yet
        </Text>
        <Text size="T400" align="Center">
          Threads you’re participating in will appear here.
        </Text>
      </Box>
    </Box>
  );
}

type ThreadsMenuProps = {
  room: Room;
  requestClose: () => void;
};
export const ThreadsMenu = forwardRef<HTMLDivElement, ThreadsMenuProps>(
  ({ room, requestClose }, ref) => {
    const threadsState = useRoomMyThreads(room);
    const threadsTimelineSet =
      threadsState.status === AsyncStatus.Success ? threadsState.data : undefined;

    const linkedTimelines = useMemo(() => {
      if (!threadsTimelineSet) return undefined;
      return getTimelines(threadsTimelineSet);
    }, [threadsTimelineSet]);

    const hasEvents = linkedTimelines && getTimelinesEventsCount(linkedTimelines) > 0;

    return (
      <Menu ref={ref} className={css.ThreadsMenu}>
        <Box grow="Yes" direction="Column">
          <Header className={css.ThreadsMenuHeader} size="500">
            <Box grow="Yes">
              <Text size="H5">My Threads</Text>
            </Box>
            <Box shrink="No">
              <IconButton size="300" onClick={requestClose} radii="300">
                <Icon src={Icons.Cross} size="400" />
              </IconButton>
            </Box>
          </Header>
          <Box grow="Yes">
            {threadsState.status === AsyncStatus.Success && hasEvents ? (
              <ThreadsTimeline timelines={linkedTimelines} requestClose={requestClose} />
            ) : (
              <Scroll size="300" hideTrack visibility="Hover">
                <Box className={css.ThreadsMenuContent} direction="Column" gap="100">
                  {(threadsState.status === AsyncStatus.Loading ||
                    threadsState.status === AsyncStatus.Idle) && <ThreadsLoading />}
                  {threadsState.status === AsyncStatus.Success && !hasEvents && <NoThreads />}
                  {threadsState.status === AsyncStatus.Error && (
                    <ThreadsError error={threadsState.error} />
                  )}
                </Box>
              </Scroll>
            )}
          </Box>
        </Box>
      </Menu>
    );
  }
);
