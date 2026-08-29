import { Box, Icon, Icons, Text, color, config, toRem } from 'folds';
import React, { MouseEventHandler, ReactNode, useCallback, useMemo } from 'react';
import { ClientEventWithoutRoomId } from 'neurone/lib/api/types';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import { LinePlaceholder } from './placeholder';
import { randomNumberBetween } from '../../utils/common';
import { MessageFailedContent } from './content';
import { useRoomEvent } from '../../hooks/useRoomEvent';
import colorMXID from '../../../util/colorMXID';
import { GetMemberPowerTag } from '../../hooks/useMemberPowerTag';
import { GetRoomMemberNameCallback } from '../../hooks/useRoomMembers';
import { rContent, rUnsigned } from '../../../client/reader';
import { TimelineView } from '../../../client/room';
import { RenderReplyContent } from '../RenderReplyContent';
import { RedactedContent } from './MsgTypeRenderers';
import { HoverUnderline } from '../../styles/Text.css';
import { useObservableValueOptionally } from '../../hooks/useObservableValue';
import { getLatestEditEvent } from '../../utils/room';
import { MessageContent } from '../MessageContent';
import { useClient } from '../../hooks/useClient';

type ReplyMessageProps = {
  username?: ReactNode;
  usernameColor?: string;
  children: ReactNode;
  onClick?: () => void;
};
export function ReplyMessage({ username, usernameColor, onClick, children }: ReplyMessageProps) {
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

  return (
    <Box alignItems="Center" gap="100">
      <Box shrink="No" gap="0" alignItems="Center" style={{ maxWidth: toRem(120) }}>
        <Icon style={{ color: usernameColor }} size="100" src={Icons.ReplyArrow} filled />
        {username}
      </Box>
      <Box {...commonProps}>{children}</Box>
    </Box>
  );
}

type ReplyProps = {
  roomId: string;
  eventId: string;
  onClick?: (replyId: string) => void;
  onUserClick?: MouseEventHandler<HTMLButtonElement>;
  getMemberPowerTag?: GetMemberPowerTag;
  accessibleTagColors?: Map<string, string>;
  legacyUsernameColor?: boolean;
  getMemberName: GetRoomMemberNameCallback;
  timeline?: TimelineView;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};

export function Reply({
  roomId,
  eventId,
  onClick,
  onUserClick,
  getMemberPowerTag,
  accessibleTagColors,
  legacyUsernameColor,
  getMemberName,
  timeline,
  htmlReactParserOptions,
  linkifyOpts,
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

  const replyClick = onClick ? () => onClick(eventId) : undefined;

  return (
    <ReplyMessage
      onClick={replyClick}
      usernameColor={usernameColor}
      username={
        sender && (
          <Text
            as="button"
            onClick={replyClick}
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
            margin: `${toRem(2)} 0`,
            height: `calc(${config.lineHeight.T300} - ${toRem(4)})`,
          }}
        />
      )}
    </ReplyMessage>
  );
}
