import { Box, Icon, Icons, Text, as, color, toRem } from 'folds';
import { EventTimelineSet, MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import React, { useEffect, useState } from 'react';
import to from 'await-to-js';
import classNames from 'classnames';
import colorMXID from '../../../util/colorMXID';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart, trimReplyFromBody } from '../../utils/matrix';
import { LinePlaceholder } from './placeholder';
import { randomNumberBetween } from '../../utils/common';
import * as css from './Reply.css';

type ReplyProps = {
  mx: MatrixClient;
  room: Room;
  timelineSet: EventTimelineSet;
  eventId: string;
};

export const Reply = as<'div', ReplyProps>(
  ({ className, mx, room, timelineSet, eventId, ...props }, ref) => {
    const [replyEvent, setReplyEvent] = useState<MatrixEvent | null | undefined>(
      timelineSet.findEventById(eventId)
    );

    const { body } = replyEvent?.getContent() ?? {};
    const sender = replyEvent?.getSender();

    const fallbackBody = replyEvent?.isRedacted()
      ? '*** This message has been deleted ***'
      : '*** Unable to load reply ***';

    useEffect(() => {
      if (replyEvent) return;

      const loadEvent = async () => {
        const [err] = await to(mx.getEventTimeline(timelineSet, eventId));
        if (err) {
          setReplyEvent(null);
          return;
        }
        const targetEvent = timelineSet.findEventById(eventId);
        setReplyEvent(targetEvent);
      };
      loadEvent();
    }, [replyEvent, mx, timelineSet, eventId]);

    return (
      <Box
        className={classNames(css.Reply, className)}
        alignItems="Center"
        gap="100"
        {...props}
        ref={ref}
      >
        <Box style={{ color: colorMXID(sender ?? eventId) }} alignItems="Center" shrink="No">
          <Icon src={Icons.ReplyArrow} size="50" />
          {sender && (
            <Text size="T300" truncate>
              {getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender)}
            </Text>
          )}
        </Box>
        <Box grow="Yes" className={css.ReplyContent}>
          {replyEvent !== undefined ? (
            <Text size="T300" truncate>
              {(body && trimReplyFromBody(body)) ?? fallbackBody}
            </Text>
          ) : (
            <LinePlaceholder
              style={{
                backgroundColor: color.SurfaceVariant.ContainerActive,
                maxWidth: toRem(randomNumberBetween(40, 400)),
                width: '100%',
              }}
            />
          )}
        </Box>
      </Box>
    );
  }
);
