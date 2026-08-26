import { Box, Text, color, config, toRem } from 'folds';
import React, { MouseEventHandler, ReactNode, useCallback, useMemo } from 'react';
import { ClientEventWithoutRoomId } from 'neurone/lib/api/types';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import { LinePlaceholder } from './placeholder';
import { randomNumberBetween } from '../../utils/common';
import * as css from './Reply.css';
import { MessageFailedContent } from './content';
import { useRoomEvent } from '../../hooks/useRoomEvent';
import colorMXID from '../../../util/colorMXID';
import { GetMemberPowerTag } from '../../hooks/useMemberPowerTag';
import { GetRoomMemberNameCallback } from '../../hooks/useRoomMembers';
import { rContent, rUnsigned } from '../../../client/reader';
import { TimelineView } from '../../../client/room';
import { RenderReplyContent } from '../RenderReplyContent';
import { Time } from './Time';
import { BubbleLayout, CompactLayout, MessageBase, ModernLayout } from './layout';
import { MessageLayout, MessageSpacing } from '../../state/settings';
import { RedactedContent } from './MsgTypeRenderers';
import { HoverUnderline } from '../../styles/Text.css';
import { useObservableValueOptionally } from '../../hooks/useObservableValue';
import { getLatestEditEvent } from '../../utils/room';
import { MessageContent } from '../MessageContent';
import { useClient } from '../../hooks/useClient';

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

  const handleClick: MouseEventHandler = (evt) => {
    const target = evt.target as HTMLElement;

    if (target.closest('a')) {
      evt.stopPropagation();
      return;
    }

    onClick?.();
  };

  const commonProps = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        className: HoverUnderline,
        style: { cursor: 'pointer' },
      }
    : {};

  if (messageLayout === MessageLayout.Compact) {
    return (
      <CompactLayout before={msgBarJSX}>
        <Box grow="Yes" direction="Column">
          <Box alignItems="Baseline" shrink="No" gap="200">
            <Box shrink="No" style={{ maxWidth: toRem(100) }}>
              {username}
            </Box>
            <Box shrink="Yes" {...commonProps}>
              {children}
            </Box>
            {time}
          </Box>
        </Box>
      </CompactLayout>
    );
  }

  if (messageLayout === MessageLayout.Bubble) {
    return (
      <BubbleLayout hideBubble before={msgBarJSX}>
        <Box alignItems="Baseline" shrink="No" gap="200">
          <Box shrink="No" style={{ maxWidth: toRem(100) }}>
            {username}
          </Box>
          <Box shrink="Yes" {...commonProps}>
            {children}
          </Box>
          {time}
        </Box>
      </BubbleLayout>
    );
  }

  return (
    <ModernLayout before={msgBarJSX}>
      <Box alignItems="Baseline" shrink="No" gap="200">
        <Box shrink="No" style={{ maxWidth: toRem(100) }}>
          {username}
        </Box>
        <Box shrink="Yes" {...commonProps}>
          {children}
        </Box>
        {time}
      </Box>
    </ModernLayout>
  );
}

type ReplyProps = {
  roomId: string;
  eventId: string;
  onClick?: (replyId: string) => void;
  onUserClick?: MouseEventHandler<HTMLButtonElement>;
  onUsernameClick?: MouseEventHandler<HTMLButtonElement>;
  getMemberPowerTag?: GetMemberPowerTag;
  accessibleTagColors?: Map<string, string>;
  legacyUsernameColor?: boolean;
  getMemberName: GetRoomMemberNameCallback;
  timeline?: TimelineView;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
  hour24Clock: boolean;
  messageLayout: MessageLayout;
  dateFormatString: string;
  messageSpacing: MessageSpacing;
};

export function Reply({
  roomId,
  eventId,
  onClick,
  onUserClick,
  onUsernameClick,
  getMemberPowerTag,
  accessibleTagColors,
  legacyUsernameColor,
  getMemberName,
  timeline,
  htmlReactParserOptions,
  linkifyOpts,
  hour24Clock,
  dateFormatString,
  messageLayout,
  messageSpacing,
}: ReplyProps) {
  const ct = useClient();
  const placeholderWidth = useMemo(() => randomNumberBetween(40, 400), []);

  const redactedEvents = useObservableValueOptionally(timeline?.relations.redacted);
  const edits = useObservableValueOptionally(timeline?.relations.edits.eventToRelations);

  const replyEvent = useRoomEvent(
    roomId,
    eventId,
    useCallback(() => timeline?.findEvent(eventId), [timeline, eventId])
  );

  const sender = replyEvent?.sender;
  const powerTag = sender ? getMemberPowerTag?.(sender) : undefined;
  const tagColor = powerTag?.color ? accessibleTagColors?.get(powerTag.color) : undefined;

  const usernameColor = legacyUsernameColor ? colorMXID(sender ?? eventId) : tagColor;

  const redacted =
    redactedEvents?.has(eventId) || !!rUnsigned.redactedBecause(replyEvent?.unsigned);

  const renderEventContent = (event: ClientEventWithoutRoomId) => {
    const editEvents = edits?.get(eventId);

    const editedEvent = getLatestEditEvent(event, editEvents, redactedEvents);

    return (
      <Box direction="Column" alignSelf="Start" style={{ maxWidth: '100%' }} as="div">
        {redacted ? (
          <RedactedContent size="T300" />
        ) : (
          <MessageContent
            event={event}
            editedEvent={editedEvent}
            roomId={roomId}
            decryptionManager={ct.decryption}
            reply
          >
            {(contentEvent) => (
              <RenderReplyContent
                displayName={getMemberName(event.sender)}
                eventType={contentEvent.type}
                edited={!!editedEvent}
                content={rContent.newContent(contentEvent.content) ?? contentEvent.content}
                htmlReactParserOptions={htmlReactParserOptions}
                linkifyOpts={linkifyOpts}
              />
            )}
          </MessageContent>
        )}
      </Box>
    );
  };

  return (
    <MessageBase space={messageSpacing}>
      <ReplyMessage
        onClick={onClick ? () => onClick(eventId) : undefined}
        messageLayout={messageLayout}
        username={
          sender && (
            <Text
              as="button"
              onClick={onUsernameClick}
              onContextMenu={onUserClick}
              className={HoverUnderline}
              style={{ color: usernameColor, cursor: 'pointer' }}
              data-user-id={sender}
              size="T300"
              truncate
            >
              <b>{getMemberName(sender)}</b>
            </Text>
          )
        }
        time={
          replyEvent && (
            <Time
              as="button"
              className={HoverUnderline}
              onClick={onClick ? () => onClick(eventId) : undefined}
              ts={replyEvent.origin_server_ts}
              dateFormatString={dateFormatString}
              hour24Clock={hour24Clock}
            />
          )
        }
        data-event-id={eventId}
      >
        {replyEvent && renderEventContent(replyEvent)}
        {replyEvent === null && (
          <Text size="T300">
            <MessageFailedContent />
          </Text>
        )}
        {replyEvent === undefined && (
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
