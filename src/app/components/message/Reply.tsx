import { Box, Text, as, color, toRem } from 'folds';
import { EventTimelineSet, MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import { CryptoBackend } from 'matrix-js-sdk/lib/common-crypto/CryptoBackend';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import to from 'await-to-js';
import classNames from 'classnames';
import colorMXID from '../../../util/colorMXID';
import { getMemberDisplayName, trimReplyFromBody } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { LinePlaceholder } from './placeholder';
import { randomNumberBetween } from '../../utils/common';
import * as css from './Reply.css';
import { MessageBadEncryptedContent, MessageDeletedContent, MessageFailedContent } from './content';
import { scaleSystemEmoji } from '../../plugins/react-custom-html-parser';

function ReplyBend() {
  return (
    <svg className={css.ReplyBend} width="9" height="16" viewBox="0 0 9 16" fill="none">
      <path
        d="M1 10C1 7.79086 2.79086 6 5 6H9V8L5 7.99999C3.89543 7.99999 3 8.89542 3 9.99999V14.0001L1 14V10Z"
        fill="currentColor"
      />
    </svg>
  );
}

type ReplyLayoutProps = {
  userColor?: string;
  username?: ReactNode;
};
export const ReplyLayout = as<'div', ReplyLayoutProps>(
  ({ username, userColor, className, children, ...props }, ref) => (
    <Box
      className={classNames(css.Reply, className)}
      alignItems="Center"
      gap="100"
      {...props}
      ref={ref}
    >
      <Box
        style={{ color: userColor, maxWidth: toRem(200) }}
        alignItems="Center"
        shrink="No"
        gap="100"
      >
        <ReplyBend />
        {username}
      </Box>
      <Box grow="Yes" className={css.ReplyContent}>
        {children}
      </Box>
    </Box>
  )
);

type ReplyProps = {
  mx: MatrixClient;
  room: Room;
  timelineSet?: EventTimelineSet;
  eventId: string;
};

export const Reply = as<'div', ReplyProps>(({ mx, room, timelineSet, eventId, ...props }, ref) => {
  const [replyEvent, setReplyEvent] = useState<MatrixEvent | null | undefined>(
    timelineSet?.findEventById(eventId)
  );
  const placeholderWidth = useMemo(() => randomNumberBetween(40, 400), []);

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
  const bodyJSX = body ? scaleSystemEmoji(trimReplyFromBody(body)) : fallbackBody;

  return (
    <ReplyLayout
      userColor={sender ? colorMXID(sender) : undefined}
      username={
        sender && (
          <Text size="T300" truncate>
            <b>{getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender)}</b>
          </Text>
        )
      }
      {...props}
      ref={ref}
    >
      {replyEvent !== undefined ? (
        <Text size="T300" truncate>
          {badEncryption ? <MessageBadEncryptedContent /> : bodyJSX}
        </Text>
      ) : (
        <LinePlaceholder
          style={{
            backgroundColor: color.SurfaceVariant.ContainerActive,
            maxWidth: toRem(placeholderWidth),
            width: '100%',
          }}
        />
      )}
    </ReplyLayout>
  );
});
