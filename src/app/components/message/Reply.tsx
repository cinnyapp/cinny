import { Box, Text, color, config, toRem } from 'folds';
import React, { MouseEventHandler, ReactNode, useCallback, useMemo } from 'react';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import { LinePlaceholder } from './placeholder';
import { randomNumberBetween } from '../../utils/common';
import * as css from './Reply.css';
import { MessageBadEncryptedContent } from './content';
import { useRoomEvent } from '../../hooks/useRoomEvent';
import colorMXID from '../../../util/colorMXID';
import { GetMemberPowerTag } from '../../hooks/useMemberPowerTag';
import { GetRoomMemberNameCallback } from '../../hooks/useRoomMembers';
import { rUnsigned } from '../../../client/reader';
import { TimelineView } from '../../../client/room';
import { RenderReplyContent } from '../RenderReplyContent';
import { Time } from './Time';
import { BubbleLayout, CompactLayout, MessageBase, ModernLayout } from './layout';
import { MessageLayout, MessageSpacing } from '../../state/settings';
import { RedactedContent } from './MsgTypeRenderers';
import { HoverUnderline } from '../../styles/Text.css';

type ReplyMessageProps = {
  username?: ReactNode;
  time?: ReactNode;
  messageLayout: MessageLayout;
  children: ReactNode;
  onClick?: () => void;
};
export function ReplyMessage({
  username,
  time,
  messageLayout,
  onClick,
  children,
}: ReplyMessageProps) {
  const msgBarJSX = <div className={css.ReplyBar} />;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  const commonProps = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick,
        onKeyDown: handleKeyDown,
        className: HoverUnderline,
        style: { cursor: 'pointer' },
      }
    : {};

  if (messageLayout === MessageLayout.Compact) {
    return (
      <CompactLayout before={msgBarJSX} {...commonProps}>
        <Box grow="Yes" direction="Column">
          <Box alignItems="Center" shrink="No" gap="200">
            <Box shrink="No" style={{ maxWidth: toRem(200) }}>
              {username}
            </Box>
            {children}
            {time}
          </Box>
        </Box>
      </CompactLayout>
    );
  }

  if (messageLayout === MessageLayout.Bubble) {
    return (
      <BubbleLayout hideBubble before={msgBarJSX} {...commonProps}>
        <Box alignItems="Center" shrink="No" gap="200">
          <Box shrink="No" style={{ maxWidth: toRem(200) }}>
            {username}
          </Box>
          {children}
          {time}
        </Box>
      </BubbleLayout>
    );
  }

  return (
    <ModernLayout before={msgBarJSX} {...commonProps}>
      <Box alignItems="Center" shrink="No" gap="200">
        <Box shrink="No" style={{ maxWidth: toRem(200) }}>
          {username}
        </Box>
        {children}
        {time}
      </Box>
    </ModernLayout>
  );
}

type ReplyProps = {
  roomId: string;
  eventId: string;
  onClick?: (replyId: string) => void;
  getMemberPowerTag?: GetMemberPowerTag;
  accessibleTagColors?: Map<string, string>;
  legacyUsernameColor?: boolean;
  getMemberName: GetRoomMemberNameCallback;
  redacted: boolean;
  timeline?: TimelineView;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
  hour24Clock: boolean;
  messageLayout: MessageLayout;
  dateFormatString: string;
  messageSpacing: MessageSpacing;
  mediaAutoLoad?: boolean;
};

export function Reply({
  roomId,
  eventId,
  onClick,
  getMemberPowerTag,
  accessibleTagColors,
  legacyUsernameColor,
  getMemberName,
  redacted,
  timeline,
  htmlReactParserOptions,
  linkifyOpts,
  hour24Clock,
  dateFormatString,
  messageLayout,
  messageSpacing,
  mediaAutoLoad,
}: ReplyProps) {
  const placeholderWidth = useMemo(() => randomNumberBetween(40, 400), []);
  const replyEvent = useRoomEvent(
    roomId,
    eventId,
    useCallback(() => timeline?.findEvent(eventId), [timeline, eventId])
  );

  const sender = replyEvent?.sender;
  const powerTag = sender ? getMemberPowerTag?.(sender) : undefined;
  const tagColor = powerTag?.color ? accessibleTagColors?.get(powerTag.color) : undefined;

  const usernameColor = legacyUsernameColor ? colorMXID(sender ?? eventId) : tagColor;

  const redactedEvent = redacted || !!rUnsigned.redactedBecause(replyEvent?.unsigned);

  // TODO: make edit message appear in reply
  return (
    <MessageBase space={messageSpacing}>
      <ReplyMessage
        onClick={onClick ? () => onClick(eventId) : undefined}
        messageLayout={messageLayout}
        username={
          sender && (
            <Text style={{ color: usernameColor }} size="T300" truncate>
              <b>{getMemberName(sender)}</b>
            </Text>
          )
        }
        time={
          replyEvent && (
            <Time
              ts={replyEvent.origin_server_ts}
              dateFormatString={dateFormatString}
              hour24Clock={hour24Clock}
            />
          )
        }
        data-event-id={eventId}
      >
        {replyEvent !== undefined ? (
          <Box direction="Column" alignSelf="Start" style={{ maxWidth: '100%' }} as="div">
            {redactedEvent && <RedactedContent size="T300" />}
            {!redactedEvent &&
              (replyEvent === null ? (
                <Text size="B300">
                  <MessageBadEncryptedContent />
                </Text>
              ) : (
                <RenderReplyContent
                  displayName={getMemberName(replyEvent.sender)}
                  eventType={replyEvent.type}
                  edited={false} // TODO:
                  content={replyEvent.content}
                  htmlReactParserOptions={htmlReactParserOptions}
                  linkifyOpts={linkifyOpts}
                />
              ))}
          </Box>
        ) : (
          <LinePlaceholder
            style={{
              backgroundColor: color.SurfaceVariant.ContainerActive,
              width: toRem(placeholderWidth),
              maxWidth: '100%',
              height: config.lineHeight.T300,
            }}
          />
        )}
      </ReplyMessage>
    </MessageBase>
  );
}
