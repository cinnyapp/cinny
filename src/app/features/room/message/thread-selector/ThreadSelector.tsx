import { Box, Icon, Icons, Line, Text } from 'folds';
import React, { ReactNode } from 'react';
import classNames from 'classnames';
import * as css from './styles.css';
import { Time } from '../../../../components/message';
import { ThreadTimeline } from '../../../../../client/room/ThreadTimeline';
import { useObservableValue } from '../../../../hooks/useObservableValue';
import { GetRoomMemberNameCallback } from '../../../../hooks/useRoomMembers';

export function ThreadSelectorContainer({ children }: { children: ReactNode }) {
  return <Box className={css.ThreadSelectorContainer}>{children}</Box>;
}

type ThreadSelectorProps = {
  thread: ThreadTimeline;
  outlined?: boolean;
  hour24Clock: boolean;
  dateFormatString: string;
  getMemberName: GetRoomMemberNameCallback;
  onClick?: (threadId: string) => void;
};

export function ThreadSelector({
  thread,
  outlined,
  hour24Clock,
  dateFormatString,
  getMemberName,
  onClick,
}: ThreadSelectorProps) {
  const meta = useObservableValue(thread.meta);
  const latestEvent = meta?.latestEvent;

  return (
    <Box
      as="button"
      type="button"
      className={classNames(css.ThreadSelector, outlined && css.ThreadSectorOutlined)}
      alignItems="Center"
      gap="300"
      onClick={() => onClick?.(thread.threadId)}
    >
      <Box className={css.ThreadRepliesCount} shrink="No" alignItems="Center" gap="200">
        <Icon size="100" src={Icons.Thread} filled />
        <Text size="L400">
          {meta?.count ?? `+${thread.liveMessages.read.size || 1}`}{' '}
          {meta?.count === 1 ? 'Reply' : 'Replies'}
        </Text>
      </Box>
      {latestEvent && (
        <>
          <Line
            className={css.ThreadSelectorDivider}
            direction="Vertical"
            variant="SurfaceVariant"
          />
          <Box gap="200" alignItems="Inherit">
            <Text size="T200" truncate>
              <span>Last reply by </span>
              <b>{getMemberName(latestEvent.sender)}</b>
              <span> — </span>
              <Time
                hour24Clock={hour24Clock}
                dateFormatString={dateFormatString}
                ts={latestEvent.origin_server_ts}
              />
            </Text>
            <Icon size="100" src={Icons.ChevronRight} />
          </Box>
        </>
      )}
    </Box>
  );
}
