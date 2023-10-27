import { Box, Icon, Icons, Text, as, color, toRem } from 'folds';
import { EventTimelineSet, MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import { CryptoBackend } from 'matrix-js-sdk/lib/common-crypto/CryptoBackend';
import React, { useEffect, useState } from 'react';
import to from 'await-to-js';
import classNames from 'classnames';
import colorMXID from '../../../util/colorMXID';
import { getMemberDisplayName, trimReplyFromBody } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { LinePlaceholder } from './placeholder';
import { randomNumberBetween } from '../../utils/common';
import * as css from './Reply.css';
import {
  MessageBadEncryptedContent,
  MessageDeletedContent,
  MessageFailedContent,
} from './MessageContentFallback';

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

    const fallbackBody = replyEvent?.isRedacted() ? (
      <MessageDeletedContent />
    ) : (
      <MessageFailedContent />
    );

    useEffect(() => {
      let disposed = false;
      const loadEvent = async () => {
        const [err, evt] = await to(mx.fetchRoomEvent(room.roomId, eventId));
        const mEvent = new MatrixEvent(evt);
        if (disposed) return;
        if (err) {
          setReplyEvent(null);
          return;
        }
        if (mEvent.isEncrypted() && mx.getCrypto()) {
          await to(mEvent.attemptDecryption(mx.getCrypto() as CryptoBackend));
        }
        setReplyEvent(mEvent);
      };
      if (replyEvent === undefined) loadEvent();
      return () => {
        disposed = true;
      };
    }, [replyEvent, mx, room, eventId]);

    const badEncryption = replyEvent?.getContent().msgtype === 'm.bad.encrypted';
    const bodyJSX = body ? trimReplyFromBody(body) : fallbackBody;

    return (
      <Box
        className={classNames(css.Reply, className)}
        alignItems="Center"
        gap="100"
        {...props}
        ref={ref}
      >
        <Box
          style={{ color: colorMXID(sender ?? eventId), maxWidth: '50%' }}
          alignItems="Center"
          shrink="No"
        >
          <Icon src={Icons.ReplyArrow} size="50" />
          {sender && (
            <Text size="T300" truncate>
              {getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender)}
            </Text>
          )}
        </Box>
        <Box grow="Yes" className={css.ReplyContent}>
          {replyEvent !== undefined ? (
            <Text className={css.ReplyContentText} size="T300" truncate>
              {badEncryption ? <MessageBadEncryptedContent /> : bodyJSX}
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
