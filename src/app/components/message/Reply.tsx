import { Box, Icon, Icons, Text, as, color, toRem } from 'folds';
import { EventTimelineSet, MsgType, Room } from 'matrix-js-sdk';
import React, { MouseEventHandler, ReactNode, useCallback, useMemo } from 'react';
import classNames from 'classnames';
import { getMemberDisplayName, trimReplyFromBody } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { LinePlaceholder } from './placeholder';
import { randomNumberBetween } from '../../utils/common';
import * as css from './Reply.css';
import { MessageBadEncryptedContent, MessageDeletedContent, MessageFailedContent } from './content';
import { scaleSystemEmoji } from '../../plugins/react-custom-html-parser';
import { useRoomEvent } from '../../hooks/useRoomEvent';
import colorMXID from '../../../util/colorMXID';
import { GetMemberPowerTag } from '../../hooks/useMemberPowerTag';

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
      <Box style={{ color: userColor, maxWidth: toRem(200) }} alignItems="Center" shrink="No">
        <Icon size="100" src={Icons.ReplyArrow} />
        {username}
      </Box>
      <Box grow="Yes" className={css.ReplyContent}>
        {children}
      </Box>
    </Box>
  )
);

/**
 * Derive a short, human-readable preview for a replied-to message that has no
 * usable text `body` (e.g. voice notes / images / files, often bridged from
 * WhatsApp). Without this, such replies fell through to the generic
 * "Failed to load message" fallback even though the event loaded fine.
 */
const getMediaReplyFallback = (
  content: Record<string, unknown> | undefined
): string | undefined => {
  if (!content) return undefined;
  const msgtype = content.msgtype as string | undefined;

  // A voice note is an m.audio event flagged with the MSC3245 voice extension.
  const isVoice =
    msgtype === MsgType.Audio &&
    (content['org.matrix.msc3245.voice'] !== undefined ||
      content['org.matrix.msc1767.audio'] !== undefined);

  switch (msgtype) {
    case MsgType.Audio:
      return isVoice ? '🎤 Voice message' : '🔊 Audio';
    case MsgType.Image:
      return '🖼️ Image';
    case MsgType.Video:
      return '🎬 Video';
    case MsgType.File:
      return '📄 File';
    case MsgType.Location:
      return '📍 Location';
    default:
      return undefined;
  }
};

export const ThreadIndicator = as<'div'>(({ ...props }, ref) => (
  <Box
    shrink="No"
    className={css.ThreadIndicator}
    alignItems="Center"
    gap="100"
    {...props}
    ref={ref}
  >
    <Icon size="50" src={Icons.Thread} />
    <Text size="L400">Thread</Text>
  </Box>
));

type ReplyProps = {
  room: Room;
  timelineSet?: EventTimelineSet | undefined;
  replyEventId: string;
  threadRootId?: string | undefined;
  onClick?: MouseEventHandler | undefined;
  getMemberPowerTag?: GetMemberPowerTag;
  accessibleTagColors?: Map<string, string>;
  legacyUsernameColor?: boolean;
};

export const Reply = as<'div', ReplyProps>(
  (
    {
      room,
      timelineSet,
      replyEventId,
      threadRootId,
      onClick,
      getMemberPowerTag,
      accessibleTagColors,
      legacyUsernameColor,
      ...props
    },
    ref
  ) => {
    const placeholderWidth = useMemo(() => randomNumberBetween(40, 400), []);
    const getFromLocalTimeline = useCallback(
      () => timelineSet?.findEventById(replyEventId),
      [timelineSet, replyEventId]
    );
    const replyEvent = useRoomEvent(room, replyEventId, getFromLocalTimeline);

    const content = replyEvent?.getContent();
    const { body } = content ?? {};
    const sender = replyEvent?.getSender();
    const powerTag = sender ? getMemberPowerTag?.(sender) : undefined;
    const tagColor = powerTag?.color ? accessibleTagColors?.get(powerTag.color) : undefined;

    const usernameColor = legacyUsernameColor ? colorMXID(sender ?? replyEventId) : tagColor;

    // When the replied-to event loaded but carries no usable text body (voice
    // notes, images, files, …), show a msgtype-based preview instead of the
    // generic "Failed to load message". Only genuinely un-renderable events
    // (redacted / no content / unknown media) hit the failure fallbacks.
    const mediaFallback = getMediaReplyFallback(content);
    let fallbackBody: ReactNode;
    if (replyEvent?.isRedacted()) {
      fallbackBody = <MessageDeletedContent />;
    } else if (mediaFallback) {
      fallbackBody = scaleSystemEmoji(mediaFallback);
    } else {
      fallbackBody = <MessageFailedContent />;
    }

    const trimmedBody = body ? trimReplyFromBody(body) : '';
    const badEncryption = replyEvent?.getContent().msgtype === 'm.bad.encrypted';
    const bodyJSX = trimmedBody ? scaleSystemEmoji(trimmedBody) : fallbackBody;

    return (
      <Box direction="Row" gap="200" alignItems="Center" {...props} ref={ref}>
        {threadRootId && (
          <ThreadIndicator as="button" data-event-id={threadRootId} onClick={onClick} />
        )}
        <ReplyLayout
          as="button"
          userColor={usernameColor}
          username={
            sender && (
              <Text size="T300" truncate>
                <b>{getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender)}</b>
              </Text>
            )
          }
          data-event-id={replyEventId}
          onClick={onClick}
        >
          {replyEvent !== undefined ? (
            <Text size="T300" truncate>
              {badEncryption ? <MessageBadEncryptedContent /> : bodyJSX}
            </Text>
          ) : (
            <LinePlaceholder
              style={{
                backgroundColor: color.SurfaceVariant.ContainerActive,
                width: toRem(placeholderWidth),
                maxWidth: '100%',
              }}
            />
          )}
        </ReplyLayout>
      </Box>
    );
  }
);
