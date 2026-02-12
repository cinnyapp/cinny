import { Box, Icon, Icons, Line, Text } from 'folds';
import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { IThreadBundledRelationship, Room } from 'matrix-js-sdk';
import * as css from './styles.css';
import { getMemberDisplayName } from '../../../../utils/room';
import { getMxIdLocalPart } from '../../../../utils/matrix';
import { Time } from '../../../../components/message';

export function ThreadSelectorContainer({ children }: { children: ReactNode }) {
  return <Box className={css.ThreadSelectorContainer}>{children}</Box>;
}

type ThreadSelectorProps = {
  room: Room;
  threadId: string;
  threadDetail: IThreadBundledRelationship;
  outlined?: boolean;
  hour24Clock: boolean;
  dateFormatString: string;
  onClick?: (threadId: string) => void;
};

export function ThreadSelector({
  room,
  threadId,
  threadDetail,
  outlined,
  hour24Clock,
  dateFormatString,
  onClick,
}: ThreadSelectorProps) {
  const latestEvent = threadDetail.latest_event;

  const latestSenderId = latestEvent.sender;
  const latestDisplayName =
    getMemberDisplayName(room, latestSenderId) ??
    getMxIdLocalPart(latestSenderId) ??
    latestSenderId;

  const latestEventTs = latestEvent.origin_server_ts;

  return (
    <Box
      as="button"
      type="button"
      className={classNames(css.ThreadSelector, outlined && css.ThreadSectorOutlined)}
      alignItems="Center"
      gap="300"
      onClick={() => onClick?.(threadId)}
    >
      <Box className={css.ThreadRepliesCount} shrink="No" alignItems="Center" gap="200">
        <Icon size="100" src={Icons.Thread} filled />
        <Text size="L400">
          {threadDetail.count} {threadDetail.count === 1 ? 'Reply' : 'Replies'}
        </Text>
      </Box>
      {latestSenderId && (
        <>
          <Line
            className={css.ThreadSelectorDivider}
            direction="Vertical"
            variant="SurfaceVariant"
          />
          <Box gap="200" alignItems="Inherit">
            <Text size="T200" truncate>
              <span>Last reply by </span>
              <b>{latestDisplayName}</b>
              <span> — </span>
              <Time
                hour24Clock={hour24Clock}
                dateFormatString={dateFormatString}
                ts={latestEventTs}
                inheritPriority
              />
            </Text>
            <Icon size="100" src={Icons.ChevronRight} />
          </Box>
        </>
      )}
    </Box>
  );
}
