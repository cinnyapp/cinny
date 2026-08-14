import React, { Fragment, MouseEventHandler, ReactNode } from 'react';
import classNames from 'classnames';
import {
  Box,
  color,
  config,
  Icon,
  IconButton,
  Icons,
  Text,
  Tooltip,
  TooltipProvider,
  toRem,
} from 'folds';
import { printMatrixError } from 'neurone/lib/matrix-request';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import { useTimelineView } from './hooks/useTimeline';
import { useObservableValue } from '../../hooks/useObservableValue';
import {
  EventSenderError,
  EventSenderPending,
  EventSenderSuccess,
  LocalEvent,
  LocalEventSender,
  LocalMessage,
} from '../../../client/room/local-event';
import { MessageBase, Reply } from '../../components/message';
import { inSameDay, minuteDifference } from '../../utils/time';
import { MessageLayout, MessageSpacing } from '../../state/settings';
import { RoomMembersAPI } from '../../hooks/useRoomMembers';
import { useClient } from '../../hooks/useClient';
import { fallbackReply, getReplyId } from '../../utils/room';
import * as css from './message/styles.css';
import { MemberPowerTag } from '../../../types/matrix/room';
import { MessageAvatar, MessageUsername, RenderMessageLayout } from './message';
import { useIsDirectRoom, useRoom } from '../../hooks/useRoom';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { InfoCard } from '../../components/info-card';
import { LocalEventOutbox } from '../../../client/room/local-event/LocalEventOutbox';
import { MessageBatch } from '../../../client/room/messages';
import { ComboDivider } from './components';
import { GetMemberPowerTag } from '../../hooks/useMemberPowerTag';

function MessageSendingError({
  sender,
  senderError,
  outbox,
}: {
  sender: LocalEventSender;
  outbox: LocalEventOutbox;
  senderError: EventSenderError;
}) {
  return (
    <InfoCard
      variant="Critical"
      title="Failed to send message."
      description={
        senderError.error
          ? senderError.error.data.error ?? printMatrixError(senderError.error)
          : (senderError.cause instanceof Error && senderError.cause.message) ?? 'Unknown Error'
      }
      after={
        <Box gap="200">
          <TooltipProvider
            tooltip={
              <Tooltip>
                <Text size="T300">Retry</Text>
              </Tooltip>
            }
          >
            {(triggerRef) => (
              <IconButton
                ref={triggerRef}
                variant="Critical"
                size="300"
                radii="300"
                outlined
                onClick={() => senderError.resend()}
              >
                <Icon size="100" src={Icons.Reload} />
              </IconButton>
            )}
          </TooltipProvider>
          <TooltipProvider
            tooltip={
              <Tooltip>
                <Text size="T300">Delete</Text>
              </Tooltip>
            }
          >
            {(triggerRef) => (
              <IconButton
                ref={triggerRef}
                variant="Critical"
                size="300"
                radii="300"
                outlined
                onClick={() => outbox.remove(sender)}
              >
                <Icon size="100" src={Icons.Delete} />
              </IconButton>
            )}
          </TooltipProvider>
        </Box>
      }
    />
  );
}

type MessageSendingProps = {
  outbox: LocalEventOutbox;
  sender: LocalEventSender;
  collapse: boolean;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  membersAPI: RoomMembersAPI;

  memberPowerTag?: MemberPowerTag;
  accessibleTagColors?: Map<string, string>;
  legacyUsernameColor?: boolean;
  onUserClick: MouseEventHandler<HTMLButtonElement>;
  onUsernameClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
};

function MessageSending({
  outbox,
  sender,
  collapse,
  messageLayout,
  messageSpacing,
  membersAPI,
  memberPowerTag,
  accessibleTagColors,
  legacyUsernameColor,
  onUserClick,
  onUsernameClick,
  children,
}: MessageSendingProps) {
  const ct = useClient();
  const { userId } = ct.session;
  const senderState = useObservableValue(sender.state);

  const senderDisplayName = membersAPI.getName(userId);
  const senderAvatarMxc = membersAPI.getAvatar(userId);

  return (
    <MessageBase
      className={classNames(css.MessageBase, {
        [css.MessageBaseBubbleCollapsed]: messageLayout === MessageLayout.Bubble && collapse,
      })}
      tabIndex={0}
      space={messageSpacing}
      collapse={collapse}
    >
      <RenderMessageLayout
        avatar={
          !collapse &&
          messageLayout !== MessageLayout.Compact && (
            <MessageAvatar
              userId={userId}
              displayName={senderDisplayName}
              avatarUrl={senderAvatarMxc}
              onUserClick={onUserClick}
              bubbleLayout={messageLayout === MessageLayout.Bubble}
            />
          )
        }
        username={
          !collapse && (
            <MessageUsername
              userId={userId}
              displayName={senderDisplayName}
              onUserClick={onUserClick}
              onUsernameClick={onUsernameClick}
              messageLayout={messageLayout}
              memberPowerTag={memberPowerTag}
              accessibleTagColors={accessibleTagColors}
              legacyUsernameColor={legacyUsernameColor}
            />
          )
        }
        time={
          <>
            {senderState instanceof EventSenderSuccess && <Icon size="50" src={Icons.Check} />}
            {senderState instanceof EventSenderError && (
              <Icon style={{ color: color.Critical.Main }} filled size="50" src={Icons.Warning} />
            )}
            {senderState instanceof EventSenderPending && <Icon size="50" src={Icons.Clock} />}
          </>
        }
        collapse={collapse}
        messageLayout={messageLayout}
      >
        {children}
        {senderState instanceof EventSenderError && (
          <div
            style={{
              marginTop: config.space.S200,
              width: toRem(400),
            }}
          >
            <MessageSendingError sender={sender} outbox={outbox} senderError={senderState} />
          </div>
        )}
      </RenderMessageLayout>
    </MessageBase>
  );
}

export function OutboxView({
  messageBatch,
  senders,
  redacted,
  messageLayout,
  messageSpacing,
  membersAPI,
  getMemberPowerTag,
  accessibleTagColors,
  legacyUsernameColor,
  onUserClick,
  onUsernameClick,
  mediaAutoLoad,
  urlPreview,
  hour24Clock,
  dateFormatString,
  onReplyClick,
  htmlReactParserOptions,
  linkifyOpts,
}: {
  messageBatch: MessageBatch;
  senders: readonly LocalEventSender[];
  redacted: Set<string>;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  membersAPI: RoomMembersAPI;
  getMemberPowerTag: GetMemberPowerTag;
  accessibleTagColors?: Map<string, string>;
  legacyUsernameColor?: boolean;
  onUserClick: MouseEventHandler<HTMLButtonElement>;
  onUsernameClick: MouseEventHandler<HTMLButtonElement>;
  mediaAutoLoad?: boolean;
  urlPreview?: boolean;
  hour24Clock: boolean;
  dateFormatString: string;
  onReplyClick?: MouseEventHandler | undefined;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
}) {
  const ct = useClient();
  const roomId = useRoom();
  const timeline = useTimelineView();
  const direct = useIsDirectRoom();

  const lastMessage = messageBatch.messages.events[messageBatch.size - 1];

  let prevMsg: LocalEvent | undefined =
    lastMessage && lastMessage.sender === ct.session.userId
      ? new LocalEvent(
          new LocalMessage(roomId, lastMessage.type, lastMessage.content),
          new LocalMessage(roomId, lastMessage.type, lastMessage.content),
          '',
          lastMessage.origin_server_ts
        )
      : undefined;

  return (
    <>
      {senders.map((sender) => {
        const dayDivider = prevMsg ? !inSameDay(prevMsg.ts, sender.localEvent.ts) : false;
        const replyEventId = fallbackReply(sender.localEvent.original.content)
          ? undefined
          : getReplyId(sender.localEvent.original.content);

        const collapse =
          !!prevMsg &&
          !dayDivider &&
          prevMsg.original.type === sender.localEvent.original.type &&
          minuteDifference(prevMsg.ts, sender.localEvent.ts) < 2 &&
          !replyEventId;

        prevMsg = sender.localEvent;

        const replyJSX = replyEventId && (
          <Reply
            roomId={roomId}
            eventId={replyEventId}
            onClick={onReplyClick}
            getMemberPowerTag={getMemberPowerTag}
            accessibleTagColors={accessibleTagColors}
            legacyUsernameColor={legacyUsernameColor || direct}
            redacted={redacted.has(replyEventId)}
            getMemberName={membersAPI.getName}
            timeline={timeline}
            htmlReactParserOptions={htmlReactParserOptions}
            linkifyOpts={linkifyOpts}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
            messageLayout={messageLayout}
            messageSpacing={messageSpacing}
            mediaAutoLoad={mediaAutoLoad}
          />
        );

        return (
          <Fragment key={sender.localEvent.txnId}>
            {dayDivider && (
              <ComboDivider ts={sender.localEvent.ts} messageSpacing={messageSpacing} />
            )}
            {replyJSX}
            <MessageSending
              key={sender.localEvent.txnId}
              outbox={timeline.outbox}
              sender={sender}
              membersAPI={membersAPI}
              messageSpacing={messageSpacing}
              messageLayout={messageLayout}
              collapse={collapse}
              onUserClick={onUserClick}
              onUsernameClick={onUsernameClick}
              memberPowerTag={getMemberPowerTag(ct.session.userId)}
              accessibleTagColors={accessibleTagColors}
              legacyUsernameColor={legacyUsernameColor || direct}
            >
              <RenderMessageContent
                displayName={membersAPI.getName(ct.session.userId)}
                eventType={sender.localEvent.original.type}
                ts={sender.localEvent.ts}
                content={sender.localEvent.original.content}
                mediaAutoLoad={mediaAutoLoad}
                urlPreview={urlPreview}
                htmlReactParserOptions={htmlReactParserOptions}
                linkifyOpts={linkifyOpts}
                outlineAttachment={messageLayout === MessageLayout.Bubble}
              />
            </MessageSending>
          </Fragment>
        );
      })}
    </>
  );
}
