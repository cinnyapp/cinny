import React, { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Header, Icon, IconButton, Icons, Scroll, Text, config } from 'folds';
import { RelationType } from 'matrix-js-sdk/lib/@types/event';
import { ReceiptType } from 'matrix-js-sdk/lib/@types/read_receipts';
import { MatrixEvent } from 'matrix-js-sdk/lib/models/event';
import { Room, RoomEvent, RoomEventHandlerMap } from 'matrix-js-sdk/lib/models/room';
import { ThreadEvent } from 'matrix-js-sdk/lib/models/thread';
import { useAtomValue, useSetAtom } from 'jotai';
import { ReactEditor } from 'slate-react';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { ImageContent, MSticker, RedactedContent, Reply } from '../../components/message';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { Image } from '../../components/media';
import { ImageViewer } from '../../components/image-viewer';
import {
  factoryRenderLinkifyWithMention,
  getReactCustomHtmlParser,
  LINKIFY_OPTS,
  makeMentionCustomProps,
  renderMatrixMention,
} from '../../plugins/react-custom-html-parser';
import {
  getEditedEvent,
  getEventReactions,
  getMemberDisplayName,
  reactionOrEditEvent,
} from '../../utils/room';
import { getMxIdLocalPart, toggleReaction } from '../../utils/matrix';
import { minuteDifference } from '../../utils/time';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { MessageLayout, MessageSpacing, settingsAtom } from '../../state/settings';
import { useSetting } from '../../state/hooks/settings';
import { createMentionElement, moveCursor, useEditor } from '../../components/editor';
import { useMentionClickHandler } from '../../hooks/useMentionClickHandler';
import { useSpoilerClickHandler } from '../../hooks/useSpoilerClickHandler';
import { GetContentCallback, MessageEvent, StateEvent } from '../../../types/matrix/room';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useImagePackRooms } from '../../hooks/useImagePackRooms';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { IReplyDraft, roomIdToReplyDraftAtomFamily } from '../../state/room/roomInputDrafts';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { EncryptedContent, Message, Reactions } from './message';
import { RoomInput } from './RoomInput';
import { RoomViewFollowing, RoomViewFollowingPlaceholder } from './RoomViewFollowing';
import * as css from './ThreadDrawer.css';

type ThreadMessageProps = {
  room: Room;
  mEvent: MatrixEvent;
  threadRootId: string;
  editId: string | undefined;
  onEditId: (id?: string) => void;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  canDelete: boolean;
  canSendReaction: boolean;
  canPinEvent: boolean;
  imagePackRooms: Room[];
  hour24Clock: boolean;
  dateFormatString: string;
  onUserClick: MouseEventHandler<HTMLButtonElement>;
  onUsernameClick: MouseEventHandler<HTMLButtonElement>;
  onReplyClick: MouseEventHandler<HTMLButtonElement>;
  onReactionToggle: (targetEventId: string, key: string, shortcode?: string) => void;
  linkifyOpts: LinkifyOpts;
  htmlReactParserOptions: HTMLReactParserOptions;
  showHideReads: boolean;
  showDeveloperTools: boolean;
  onReferenceClick: MouseEventHandler<HTMLButtonElement>;
  jumpToEventId?: string;
  collapse?: boolean;
};

function ThreadMessage({
  room,
  threadRootId: threadRootIdProp,
  mEvent,
  editId,
  onEditId,
  messageLayout,
  messageSpacing,
  canDelete,
  canSendReaction,
  collapse = false,
  canPinEvent,
  imagePackRooms,
  hour24Clock,
  dateFormatString,
  onUserClick,
  onUsernameClick,
  onReplyClick,
  onReactionToggle,
  linkifyOpts,
  htmlReactParserOptions,
  showHideReads,
  showDeveloperTools,
  onReferenceClick,
  jumpToEventId,
}: ThreadMessageProps) {
  // Use the thread's own timeline set so reactions/edits on thread events are found correctly
  const threadTimelineSet = room.getThread(threadRootIdProp)?.timelineSet;
  const timelineSet = threadTimelineSet ?? room.getUnfilteredTimelineSet();
  const mEventId = mEvent.getId()!;
  const senderId = mEvent.getSender() ?? '';
  const senderDisplayName =
    getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;

  const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
  const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
  const [encUrlPreview] = useSetting(settingsAtom, 'encUrlPreview');
  const showUrlPreview = room.hasEncryptionStateEvent() ? encUrlPreview : urlPreview;

  const editedEvent = getEditedEvent(mEventId, mEvent, timelineSet);
  const editedNewContent = editedEvent?.getContent()['m.new_content'];
  const baseContent = mEvent.getContent();
  const safeContent =
    Object.keys(baseContent).length > 0 ? baseContent : mEvent.getOriginalContent();
  const getContent = (() => editedNewContent ?? safeContent) as GetContentCallback;

  const reactionRelations = getEventReactions(timelineSet, mEventId);
  const reactions = reactionRelations?.getSortedAnnotationsByKey();
  const hasReactions = reactions && reactions.length > 0;

  const { replyEventId } = mEvent;

  return (
    <Message
      key={mEvent.getId()}
      data-message-id={mEventId}
      room={room}
      mEvent={mEvent}
      messageSpacing={messageSpacing}
      messageLayout={messageLayout}
      collapse={collapse}
      highlight={jumpToEventId === mEventId}
      edit={editId === mEventId}
      canDelete={canDelete}
      canSendReaction={canSendReaction}
      canPinEvent={canPinEvent}
      imagePackRooms={imagePackRooms}
      relations={hasReactions ? reactionRelations : undefined}
      onUserClick={onUserClick}
      onUsernameClick={onUsernameClick}
      onReplyClick={onReplyClick}
      onReactionToggle={onReactionToggle}
      onEditId={onEditId}
      hour24Clock={hour24Clock}
      dateFormatString={dateFormatString}
      hideReadReceipts={showHideReads}
      hideThreadButton
      showDeveloperTools={showDeveloperTools}
      reply={
        replyEventId &&
        replyEventId !== threadRootIdProp && (
          <Reply
            room={room}
            timelineSet={timelineSet}
            replyEventId={replyEventId}
            onClick={onReferenceClick}
          />
        )
      }
      reactions={
        hasReactions && reactionRelations ? (
          <Reactions
            style={{ marginTop: config.space.S200 }}
            room={room}
            relations={reactionRelations}
            mEventId={mEventId}
            canSendReaction={canSendReaction}
            onReactionToggle={onReactionToggle}
          />
        ) : undefined
      }
    >
      {mEvent.isRedacted() ? (
        <RedactedContent reason={mEvent.getUnsigned().redacted_because?.content.reason} />
      ) : (
        <EncryptedContent mEvent={mEvent}>
          {() => {
            if (mEvent.isRedacted())
              return (
                <RedactedContent reason={mEvent.getUnsigned().redacted_because?.content.reason} />
              );

            if (mEvent.getType() === MessageEvent.Sticker)
              return (
                <MSticker
                  content={mEvent.getContent()}
                  renderImageContent={(props) => (
                    <ImageContent
                      {...props}
                      autoPlay={mediaAutoLoad}
                      renderImage={(p) => <Image {...p} loading="lazy" />}
                      renderViewer={(p) => <ImageViewer {...p} />}
                    />
                  )}
                />
              );

            if (mEvent.getType() === MessageEvent.RoomMessage) {
              return (
                <RenderMessageContent
                  displayName={senderDisplayName}
                  msgType={(editedNewContent ?? safeContent).msgtype ?? ''}
                  ts={mEvent.getTs()}
                  edited={!!editedEvent}
                  getContent={getContent}
                  mediaAutoLoad={mediaAutoLoad}
                  urlPreview={showUrlPreview}
                  htmlReactParserOptions={htmlReactParserOptions}
                  linkifyOpts={linkifyOpts}
                  outlineAttachment={messageLayout === MessageLayout.Bubble}
                />
              );
            }

            return (
              <RenderMessageContent
                displayName={senderDisplayName}
                msgType={(editedNewContent ?? safeContent).msgtype ?? ''}
                ts={mEvent.getTs()}
                edited={!!editedEvent}
                getContent={getContent}
                mediaAutoLoad={mediaAutoLoad}
                urlPreview={showUrlPreview}
                htmlReactParserOptions={htmlReactParserOptions}
                linkifyOpts={linkifyOpts}
                outlineAttachment={messageLayout === MessageLayout.Bubble}
              />
            );
          }}
        </EncryptedContent>
      )}
    </Message>
  );
}

type ThreadDrawerProps = {
  room: Room;
  threadRootId: string;
  onClose: () => void;
  overlay?: boolean;
};

export function ThreadDrawer({ room, threadRootId, onClose, overlay }: ThreadDrawerProps) {
  const mx = useMatrixClient();
  const drawerRef = useRef<HTMLDivElement>(null);
  const editor = useEditor();
  const [, forceUpdate] = useState(0);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [jumpToEventId, setJumpToEventId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevReplyCountRef = useRef(0);
  const replyEventsRef = useRef<MatrixEvent[]>([]);
  const useAuthentication = useMediaAuthentication();
  const mentionClickHandler = useMentionClickHandler(room.roomId);
  const spoilerClickHandler = useSpoilerClickHandler();

  // Settings
  const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
  const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const [showDeveloperTools] = useSetting(settingsAtom, 'developerTools');

  // Memoized parsing options
  const linkifyOpts = useMemo<LinkifyOpts>(
    () => ({
      ...LINKIFY_OPTS,
      render: factoryRenderLinkifyWithMention((href) =>
        renderMatrixMention(mx, room.roomId, href, makeMentionCustomProps(mentionClickHandler))
      ),
    }),
    [mx, room, mentionClickHandler]
  );

  const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
    () =>
      getReactCustomHtmlParser(mx, room.roomId, {
        linkifyOpts,
        useAuthentication,
        handleSpoilerClick: spoilerClickHandler,
        handleMentionClick: mentionClickHandler,
      }),
    [mx, room, linkifyOpts, spoilerClickHandler, mentionClickHandler, useAuthentication]
  );

  // Power levels & permissions
  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);
  const permissions = useRoomPermissions(creators, powerLevels);
  const canRedact = permissions.action('redact', mx.getSafeUserId());
  const canDeleteOwn = permissions.event(MessageEvent.RoomRedaction, mx.getSafeUserId());
  const canSendReaction = permissions.event(MessageEvent.Reaction, mx.getSafeUserId());
  const canPinEvent = permissions.stateEvent(StateEvent.RoomPinnedEvents, mx.getSafeUserId());

  // Image packs
  const roomToParents = useAtomValue(roomToParentsAtom);
  const imagePackRooms: Room[] = useImagePackRooms(room.roomId, roomToParents);

  // Reply draft (keyed by threadRootId to match RoomInput's draftKey logic)
  const setReplyDraft = useSetAtom(roomIdToReplyDraftAtomFamily(threadRootId));
  const replyDraft = useAtomValue(roomIdToReplyDraftAtomFamily(threadRootId));
  const activeReplyId = replyDraft?.eventId;

  // User profile popup
  const openUserRoomProfile = useOpenUserRoomProfile();

  const rootEvent = room.findEventById(threadRootId);

  // Re-render when new thread events arrive (including reactions via ThreadEvent.Update).
  useEffect(() => {
    const isEventInThread = (mEvent: MatrixEvent): boolean => {
      // Direct thread message or the root itself
      if (mEvent.threadRootId === threadRootId || mEvent.getId() === threadRootId) {
        return true;
      }

      // Check if this is a reaction/edit targeting an event in this thread
      if (reactionOrEditEvent(mEvent)) {
        const relation = mEvent.getRelation();
        const targetEventId = relation?.event_id;
        if (targetEventId) {
          const targetEvent = room.findEventById(targetEventId);
          if (
            targetEvent &&
            (targetEvent.threadRootId === threadRootId || targetEvent.getId() === threadRootId)
          ) {
            return true;
          }
        }
      }

      return false;
    };

    const onTimeline: RoomEventHandlerMap[RoomEvent.Timeline] = (mEvent) => {
      if (isEventInThread(mEvent)) {
        forceUpdate((n) => n + 1);
      }
    };
    const onRedaction: RoomEventHandlerMap[RoomEvent.Redaction] = (mEvent) => {
      if (isEventInThread(mEvent)) {
        forceUpdate((n) => n + 1);
      }
    };
    const onThreadUpdate = () => forceUpdate((n) => n + 1);
    room.on(RoomEvent.Timeline, onTimeline);
    room.on(RoomEvent.Redaction, onRedaction);
    (room as any).on(ThreadEvent.Update, onThreadUpdate);
    (room as any).on(ThreadEvent.NewReply, onThreadUpdate);
    return () => {
      room.removeListener(RoomEvent.Timeline, onTimeline);
      room.removeListener(RoomEvent.Redaction, onRedaction);
      (room as any).removeListener(ThreadEvent.Update, onThreadUpdate);
      (room as any).removeListener(ThreadEvent.NewReply, onThreadUpdate);
    };
  }, [mx, room, threadRootId]);

  // Use the Thread object if available (authoritative source with full history).
  // Fall back to scanning the live room timeline for local echoes and the
  // window before the Thread object is registered by the SDK.
  const replyEvents: MatrixEvent[] = (() => {
    const thread = room.getThread(threadRootId);
    const fromThread = thread?.events ?? [];
    if (fromThread.length > 0) {
      return fromThread.filter(
        (ev: MatrixEvent) => ev.getId() !== threadRootId && !reactionOrEditEvent(ev)
      );
    }
    return room
      .getUnfilteredTimelineSet()
      .getLiveTimeline()
      .getEvents()
      .filter(
        (ev: MatrixEvent) =>
          ev.threadRootId === threadRootId &&
          ev.getId() !== threadRootId &&
          !reactionOrEditEvent(ev)
      );
  })();

  replyEventsRef.current = replyEvents;

  // Mark thread as read when viewing it and when new messages arrive
  useEffect(() => {
    const markThreadAsRead = async () => {
      const thread = room.getThread(threadRootId);
      if (!thread) return;

      const events = thread.events || [];
      if (events.length === 0) return;

      const lastEvent = events[events.length - 1];
      if (!lastEvent || lastEvent.isSending()) return;

      const userId = mx.getUserId();
      if (!userId) return;

      const readUpToId = thread.getEventReadUpTo(userId, false);
      const lastEventId = lastEvent.getId();

      // Only send receipt if we haven't already read up to the last event
      if (readUpToId !== lastEventId) {
        try {
          await mx.sendReadReceipt(
            lastEvent,
            hideActivity ? ReceiptType.ReadPrivate : ReceiptType.Read
          );
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Failed to send thread read receipt:', err);
        }
      }
    };

    markThreadAsRead();
  }, [mx, room, threadRootId, replyEvents.length, hideActivity]);

  // Auto-scroll to bottom when event count grows (if the user is near the bottom).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (prevReplyCountRef.current === 0 || isAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
    prevReplyCountRef.current = replyEvents.length;
  }, [replyEvents.length]);

  const handleUserClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const userId = evt.currentTarget.getAttribute('data-user-id');
      if (!userId) return;
      openUserRoomProfile(
        room.roomId,
        undefined,
        userId,
        evt.currentTarget.getBoundingClientRect()
      );
    },
    [room, openUserRoomProfile]
  );

  const handleUsernameClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      evt.preventDefault();
      const userId = evt.currentTarget.getAttribute('data-user-id');
      if (!userId) return;
      const name = getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;
      editor.insertNode(
        createMentionElement(
          userId,
          name.startsWith('@') ? name : `@${name}`,
          userId === mx.getUserId()
        )
      );
      ReactEditor.focus(editor);
      moveCursor(editor);
    },
    [mx, room, editor]
  );

  const handleReplyClick = useCallback(
    (evt: Parameters<MouseEventHandler<HTMLButtonElement>>[0]) => {
      const replyId = evt.currentTarget.getAttribute('data-event-id');
      if (!replyId) {
        // In thread mode, resetting means going back to base thread draft
        setReplyDraft({
          userId: mx.getUserId() ?? '',
          eventId: threadRootId,
          body: '',
          relation: { rel_type: RelationType.Thread, event_id: threadRootId },
        });
        return;
      }
      const replyEvt = room.findEventById(replyId);
      if (!replyEvt) return;
      const editedReply = getEditedEvent(replyId, replyEvt, room.getUnfilteredTimelineSet());
      const content = editedReply?.getContent()['m.new_content'] ?? replyEvt.getContent();
      const { body, formatted_body: formattedBody } = content;
      const senderId = replyEvt.getSender();
      if (senderId) {
        const draft: IReplyDraft = {
          userId: senderId,
          eventId: replyId,
          body: typeof body === 'string' ? body : '',
          formattedBody,
          relation: { rel_type: RelationType.Thread, event_id: threadRootId },
        };
        // Only toggle off if we're actively replying to this event (non-empty body distinguishes
        // a real reply draft from the seeded base-thread draft, which has body: '').
        if (activeReplyId === replyId && replyDraft?.body) {
          // Toggle off — reset to base thread draft
          setReplyDraft({
            userId: mx.getUserId() ?? '',
            eventId: threadRootId,
            body: '',
            relation: { rel_type: RelationType.Thread, event_id: threadRootId },
          });
        } else {
          setReplyDraft(draft);
        }
      }
    },
    [mx, room, setReplyDraft, activeReplyId, threadRootId, replyDraft]
  );

  const handleReactionToggle = useCallback(
    (targetEventId: string, key: string, shortcode?: string) => {
      const threadTimelineSet = room.getThread(threadRootId)?.timelineSet;
      toggleReaction(mx, room, targetEventId, key, shortcode, threadTimelineSet);
    },
    [mx, room, threadRootId]
  );

  const handleEdit = useCallback(
    (evtId?: string) => {
      setEditId(evtId);
      if (!evtId) {
        ReactEditor.focus(editor);
        moveCursor(editor);
      }
    },
    [editor]
  );

  const handleOpenReply: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      const targetId = evt.currentTarget.getAttribute('data-event-id');
      if (!targetId) return;
      const isRoot = targetId === threadRootId;
      const isInReplies = replyEventsRef.current.some((e) => e.getId() === targetId);
      if (!isRoot && !isInReplies) return;
      setJumpToEventId(targetId);
      setTimeout(() => setJumpToEventId(undefined), 2500);
      const el = drawerRef.current;
      if (el) {
        const target = el.querySelector(`[data-message-id="${targetId}"]`);
        target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    },
    [threadRootId]
  );

  const sharedMessageProps = {
    room,
    threadRootId,
    editId,
    onEditId: handleEdit,
    messageLayout,
    messageSpacing,
    canDelete: canRedact || canDeleteOwn,
    canSendReaction,
    canPinEvent,
    imagePackRooms,
    hour24Clock,
    dateFormatString,
    onUserClick: handleUserClick,
    onUsernameClick: handleUsernameClick,
    onReplyClick: handleReplyClick,
    onReactionToggle: handleReactionToggle,
    linkifyOpts,
    htmlReactParserOptions,
    showHideReads: hideActivity,
    showDeveloperTools,
    onReferenceClick: handleOpenReply,
    jumpToEventId,
  };

  // Latest thread event for the following indicator (latest reply, or root if no replies)
  const threadParticipantIds = new Set(
    [rootEvent, ...replyEvents].map((ev) => ev?.getSender()).filter(Boolean) as string[]
  );
  const latestThreadEventId = (
    replyEvents.length > 0 ? replyEvents[replyEvents.length - 1] : rootEvent
  )?.getId();

  return (
    <Box
      ref={drawerRef}
      className={overlay ? css.ThreadDrawerOverlay : css.ThreadDrawer}
      direction="Column"
      shrink="No"
    >
      {/* Header */}
      <Header className={css.ThreadDrawerHeader} variant="Background" size="600">
        <Box grow="Yes" alignItems="Center" gap="200">
          <Icon size="200" src={Icons.Thread} />
          <Text size="H5" truncate>
            Thread
          </Text>
        </Box>
        <Box alignItems="Center" gap="200" shrink="No">
          <Text size="T300" priority="300" truncate>
            # {room.name}
          </Text>
          <IconButton onClick={onClose} variant="Background" aria-label="Close thread">
            <Icon src={Icons.Cross} />
          </IconButton>
        </Box>
      </Header>

      {/* Thread root message */}
      {rootEvent && (
        <Scroll
          variant="Background"
          visibility="Hover"
          direction="Vertical"
          hideTrack={false}
          style={{
            maxHeight: '200px',
            flexShrink: 0,
            height: 'auto',
          }}
        >
          <Box
            className={css.messageList}
            direction="Column"
            style={{
              padding: `${config.space.S200} 0`,
            }}
          >
            <ThreadMessage {...sharedMessageProps} mEvent={rootEvent} />
          </Box>
        </Scroll>
      )}

      {/* Replies */}
      <Box className={css.ThreadDrawerContent} grow="Yes" direction="Column">
        <Scroll
          ref={scrollRef}
          variant="Background"
          visibility="Hover"
          direction="Vertical"
          hideTrack
          style={{ flexGrow: 1 }}
        >
          {replyEvents.length === 0 ? (
            <Box
              direction="Column"
              alignItems="Center"
              justifyContent="Center"
              style={{ padding: config.space.S400, gap: config.space.S200 }}
            >
              <Icon size="400" src={Icons.Thread} />
              <Text size="T300" align="Center">
                No replies yet. Start the thread below!
              </Text>
            </Box>
          ) : (
            <>
              {/* Reply count label inside scroll area */}
              <Box
                style={{
                  padding: `${config.space.S200} ${config.space.S400}`,
                  flexShrink: 0,
                }}
              >
                <Text size="T300" priority="300">
                  {replyEvents.length} {replyEvents.length === 1 ? 'reply' : 'replies'}
                </Text>
              </Box>
              <Box
                className={css.messageList}
                direction="Column"
                style={{ padding: `${config.space.S600} 0` }}
              >
                {replyEvents.map((mEvent, i) => {
                  const prevEvent = i > 0 ? replyEvents[i - 1] : undefined;
                  const collapse =
                    prevEvent !== undefined &&
                    prevEvent.getSender() === mEvent.getSender() &&
                    prevEvent.getType() === mEvent.getType() &&
                    minuteDifference(prevEvent.getTs(), mEvent.getTs()) < 2;
                  return (
                    <ThreadMessage
                      key={mEvent.getId()}
                      {...sharedMessageProps}
                      mEvent={mEvent}
                      collapse={collapse}
                    />
                  );
                })}
              </Box>
            </>
          )}
        </Scroll>
      </Box>

      {/* Thread input */}
      <Box className={css.ThreadDrawerInput} direction="Column" shrink="No">
        <div style={{ padding: `0 ${config.space.S400}` }}>
          <RoomInput
            key={threadRootId}
            room={room}
            roomId={room.roomId}
            threadRootId={threadRootId}
            editor={editor}
            fileDropContainerRef={drawerRef}
          />
        </div>
        {hideActivity ? (
          <RoomViewFollowingPlaceholder />
        ) : (
          <RoomViewFollowing
            style={{ backgroundColor: 'transparent' }}
            room={room}
            threadEventId={latestThreadEventId}
            participantIds={threadParticipantIds}
          />
        )}
      </Box>
    </Box>
  );
}
