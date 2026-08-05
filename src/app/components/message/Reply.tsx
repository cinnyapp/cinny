import { Box, Text, color, toRem } from 'folds';
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
import { RenderMessageContent } from '../RenderMessageContent';
import { Time } from './Time';
import { BubbleLayout, CompactLayout, MessageBase, ModernLayout } from './layout';
import { MessageLayout, MessageSpacing } from '../../state/settings';
import { RedactedContent } from './MsgTypeRenderers';

type ReplyMessageProps = {
  username?: ReactNode;
  time?: ReactNode;
  messageLayout: MessageLayout;
  children: ReactNode;
};
export function ReplyMessage({ username, time, messageLayout, children }: ReplyMessageProps) {
  const msgBarJSX = <div className={css.ReplyBar} />;

  if (messageLayout === MessageLayout.Compact) {
    return (
      <CompactLayout before={msgBarJSX}>
        <Box grow="Yes" direction="Column">
          <Box alignItems="Baseline" shrink="No" gap="200">
            {username}
            {time}
          </Box>
          {children}
        </Box>
      </CompactLayout>
    );
  }

  if (messageLayout === MessageLayout.Bubble) {
    return (
      <BubbleLayout
        hideBubble
        before={msgBarJSX}
        header={
          <Box alignItems="Baseline" shrink="No" gap="200">
            {username}
            {time}
          </Box>
        }
      >
        {children}
      </BubbleLayout>
    );
  }

  return (
    <ModernLayout before={msgBarJSX}>
      <Box alignItems="Baseline" shrink="No" gap="200">
        {username}
        {time}
      </Box>
      {children}
    </ModernLayout>
  );
}

type ReplyProps = {
  roomId: string;
  eventId: string;
  onClick?: MouseEventHandler | undefined;
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

  return (
    <MessageBase space={messageSpacing}>
      <ReplyMessage
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
            {redactedEvent && <RedactedContent />}
            {!redactedEvent &&
              (replyEvent === null ? (
                <Text>
                  <MessageBadEncryptedContent />
                </Text>
              ) : (
                <RenderMessageContent
                  displayName={getMemberName(replyEvent.sender)}
                  eventType={replyEvent.type}
                  ts={replyEvent.origin_server_ts}
                  edited={false}
                  content={replyEvent.content}
                  mediaAutoLoad={mediaAutoLoad}
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
            }}
          />
        )}
      </ReplyMessage>
    </MessageBase>
  );
}
