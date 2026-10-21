import React from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { Box, color, config, Text } from 'folds';
import { useReplayProgress } from '../../hooks/useReplayProgress';
import { ContainerColor } from '../../styles/ContainerColor.css';

type ReplayStatusProps = {
  mx: MatrixClient;
};

/**
 * Thin strip shown while the staged start-up is still rebuilding the older
 * chats behind the open app: "Loading older chats… 640 / 1,809" over a 2 px
 * progress line. Unmounts when the replay is done.
 */
export function ReplayStatus({ mx }: ReplayStatusProps) {
  const replay = useReplayProgress(mx);
  if (!replay.active || replay.total === 0) return null;
  const pct = Math.min(100, Math.round((replay.done / replay.total) * 100));

  return (
    <Box direction="Column" shrink="No" data-testid="replay-status">
      <Box
        className={ContainerColor({ variant: 'Surface' })}
        style={{ padding: `${config.space.S100} 0` }}
        alignItems="Center"
        justifyContent="Center"
      >
        <Text size="L400">
          {`Loading older chats… ${replay.done.toLocaleString()} / ${replay.total.toLocaleString()}`}
        </Text>
      </Box>
      <div style={{ height: 2, background: color.SurfaceVariant.Container, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color.Primary.Main,
            transition: 'width 0.3s linear',
          }}
        />
      </div>
    </Box>
  );
}
