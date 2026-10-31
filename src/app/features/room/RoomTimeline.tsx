import React, {
  MouseEventHandler,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ReactEditor } from 'slate-react';
import { Editor } from 'slate';
import { Box, Scroll, config, toRem } from 'folds';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { useVirtualPaginator } from '../../hooks/useVirtualPaginator';
import {
  DefaultPlaceholder,
  CompactPlaceholder,
  Reply,
  RedactedContent,
} from '../../components/message';
import { getLatestEditEvent, getReplyId, getThreadId } from '../../utils/room';
import { useSettings } from '../../state/hooks/settings';
import { MessageLayout } from '../../state/settings';
import { Reactions, Message, ThreadEvents } from './message';
import { RoomIntro } from '../../components/room-intro';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { MessageEvent, StateEvent } from '../../../types/matrix/room';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { useIgnoredUsers } from '../../hooks/useIgnoredUsers';
import { useImagePackRooms } from '../../hooks/useImagePackRooms';
import { useIsDirectRoom, useRoom } from '../../hooks/useRoom';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useAccessiblePowerTagColors, useGetMemberPowerTag } from '../../hooks/useMemberPowerTag';
import { useTheme } from '../../hooks/useTheme';
import { useRoomCreatorsTag } from '../../hooks/useRoomCreatorsTag';
import { usePowerLevelTags, usePowerLevelTagsState } from '../../hooks/usePowerLevelTags';
import { Timeline } from '../../../client/room';
import { useObservableValue, useObservableValueListener } from '../../hooks/useObservableValue';
import { useClient } from '../../hooks/useClient';
import { useRoomMembersAPI } from '../../hooks/useRoomMembers';
import { useGetRoomName } from '../../hooks/storage/useGetRoomName';
import { useRoomHeroes } from '../../hooks/storage/useRoomHeros';
import { useGetRoomAvatar } from '../../hooks/storage/useGetRoomAvatar';
import {
  useAtBottomToggle,
  useAutoMarkAsRead,
  useEditorResizeStickBottom,
  useEventCollapse,
  useEventDivider,
  useFocusItem,
  useGetItemElement,
  useJumpHandlers,
  useMessageArrive,
  useMessageEditorOutOfViewFocus,
  useNewDividerVisiblity,
  useOnRangeChange,
  useReplyClickHandler,
  useRestoreScrollToBottom,
  useTimelineBatch,
  useTimelineContainerResizeStickBottom,
  useTimelinePaginate,
  useTimelinePrefetch,
  useTimelineRelations,
  useTimelineScrollRestore,
  useUnreadMarker,
  useUserClickHandler,
  useUsernameClickHandler,
} from './hooks/useTimeline';
import { RoomViewTyping } from './RoomViewTyping';
import { rContent } from '../../../client/reader';
import { ThreadSelector } from './message/thread-selector';
import {
  TimelineFloat,
  JumpToLatestButton,
  ComboDivider,
  PlaceholderList,
  UnreadControls,
} from './components';
import { OutboxView } from './OutboxView';
import { useUserReadReceipt } from '../../hooks/useReadReceipt';
import { useMessageParserOptions } from '../../hooks/useMessageParserOptions';
import { MessageContent } from '../../components/MessageContent';
import { MessageEditor } from './message/MessageEditor';
import { useSendReaction } from './hooks/useSendReaction';
import { useWindowFocus } from '../../hooks/useWindowFocus';
import { useMarkAsRead } from '../../hooks/useMarkAsRead';

type RoomTimelineProps = {
  eventId?: string;
  roomInputRef: RefObject<HTMLElement>;
  editor: Editor;
  timeline: Timeline;
};

const PAGINATION_LIMIT = 80;

export function RoomTimeline({ eventId, roomInputRef, editor, timeline }: RoomTimelineProps) {
  const ct = useClient();
  const roomId = useRoom();
  const encryptedRooms = useObservableValue(ct.encryptedRooms);

  const {
    hideActivity,
    messageLayout,
    messageSpacing,
    legacyUsernameColor,
    mediaAutoLoad,
    urlPreview,
    encUrlPreview,
    showHiddenEvents,
    developerTools,
    hour24Clock,
    dateFormatString,
  } = useSettings();

  const direct = useIsDirectRoom();
  const showUrlPreview = encryptedRooms.has(roomId) ? encUrlPreview : urlPreview;

  const ignoredUsersList = useIgnoredUsers();
  const ignoredUsersSet = useMemo(() => new Set(ignoredUsersList), [ignoredUsersList]);

  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(roomId);

  const getRoomHeroes = useRoomHeroes();
  const getRoomName = useGetRoomName(getRoomHeroes);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes);

  const membersAPI = useRoomMembersAPI();
  const creatorsTag = useRoomCreatorsTag();
  const powerLevelTagsState = usePowerLevelTagsState(roomId);
  const powerLevelTags = usePowerLevelTags(powerLevels, powerLevelTagsState.value);
  const getMemberPowerTag = useGetMemberPowerTag(creators, powerLevels);

  const theme = useTheme();
  const accessiblePowerTagColors = useAccessiblePowerTagColors(
    theme.kind,
    creatorsTag,
    powerLevelTags
  );

  const permissions = useRoomPermissions(creators, powerLevels);

  const canRedact = permissions.action('redact', ct.session.userId);
  const canDeleteOwn = permissions.event(MessageEvent.RoomRedaction, ct.session.userId);
  const canSendReaction = permissions.event(MessageEvent.Reaction, ct.session.userId);
  const canPinEvent = permissions.stateEvent(StateEvent.RoomPinnedEvents, ct.session.userId);
  const [editId, setEditId] = useState<string>();

  const imagePackRooms = useImagePackRooms(roomId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const { linkifyOpts, htmlReactParserOptions, htmlReactParserInlineOptions } =
    useMessageParserOptions(roomId, getRoomName, membersAPI.getName);

  const activeThread = useObservableValue(timeline.activeThread);
  const threads = useObservableValue(timeline.threads);
  const { redacted, reactions, edits } = useTimelineRelations(timeline);

  const localEventSenders = useObservableValue(timeline.outbox.senders);
  const { messageBatch, events, range, rangeAtStart, rangeAtEnd, atLiveEnd } =
    useTimelineBatch(timeline);

  const getScrollElement = useCallback(() => scrollRef.current, []);

  const readReceipt = useUserReadReceipt();

  const [eventLoading, setEventLoading] = useState(false);
  useTimelinePrefetch(timeline, PAGINATION_LIMIT, !eventLoading);
  const handlePaginate = useTimelinePaginate(timeline, PAGINATION_LIMIT, !eventLoading);

  const { getItems, scrollToItem, scrollToElement, observeBackAnchor, observeFrontAnchor } =
    useVirtualPaginator({
      count: messageBatch.size,
      limit: PAGINATION_LIMIT,
      range,
      onRangeChange: useOnRangeChange(timeline),
      getScrollElement,
      getItemElement: useGetItemElement(scrollRef),
      onEnd: handlePaginate,
    });

  const { focusItem, setFocusItem } = useFocusItem(timeline, scrollToItem);
  const focused = useWindowFocus();
  useTimelineScrollRestore(timeline, scrollRef);
  useRestoreScrollToBottom(scrollRef, messageBatch);

  const { atBottomLazy, atBottomObservable, atBottomAnchorRef } = useAtBottomToggle(
    getScrollElement,
    atLiveEnd
  );

  const { markerTs, markerTsRef } = useUnreadMarker(atBottomLazy, focused, readReceipt?.ts);

  const markAsRead = useMarkAsRead(roomId);

  const { observeNewDivider, newDividerVisible } = useNewDividerVisiblity(getScrollElement);
  const lastDividerVisibleTs = useRef<number>();
  if (newDividerVisible) {
    lastDividerVisibleTs.current = markerTs;
  }

  const autoMarkAsRead = useAutoMarkAsRead(
    atBottomObservable,
    markerTsRef,
    lastDividerVisibleTs,
    markAsRead
  );

  useMessageArrive(
    timeline,
    useCallback(() => {
      setTimeout(autoMarkAsRead, 100);
    }, [autoMarkAsRead])
  );

  useObservableValueListener(atBottomObservable, autoMarkAsRead);

  useTimelineContainerResizeStickBottom(
    timeline,
    getScrollElement,
    useCallback(() => timelineContainerRef.current, []),
    atBottomObservable,
    !focusItem && atLiveEnd
  );
  useEditorResizeStickBottom(
    getScrollElement,
    useCallback(() => roomInputRef.current, [roomInputRef]),
    atBottomObservable
  );
  useMessageEditorOutOfViewFocus(scrollRef, scrollToElement, editId);

  const { handleOpenEvent, handleJumpToUnread } = useJumpHandlers(
    timeline,
    readReceipt,
    scrollToItem,
    setFocusItem,
    setEventLoading
  );

  useEffect(() => {
    if (eventId) {
      handleOpenEvent(eventId);
    }
  }, [eventId, handleOpenEvent]);

  const handleUserClick = useUserClickHandler();
  const handleUsernameClick = useUsernameClickHandler(editor);
  const [replyDraft, handleReplyClick] = useReplyClickHandler(editor);

  const { reactionSender, handleAddReaction } = useSendReaction(reactions, redacted);

  const handleEdit = useCallback(
    (editEvtId?: string) => {
      if (editEvtId) {
        setEditId(editEvtId);
        return;
      }
      setEditId(undefined);
      ReactEditor.focus(editor);
    },
    [editor]
  );

  const handleOpenThread = (threadId: string) => {
    timeline.openThread(threadId);
  };

  const handleThreadClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      const targetId = evt.currentTarget.getAttribute('data-event-id');
      if (!targetId) return;

      timeline.openThread(targetId);
    },
    [timeline]
  );

  let threadSeries: MessageEventWithoutRoomId[] = [];
  const renderMatrixEvent = (event: MessageEventWithoutRoomId, item: number, collapse: boolean) => {
    const reactionEvents = reactions.get(event.event_id)?.filter((r) => !redacted.has(r.event_id));
    const reactionSenderTarget =
      reactionSender?.localEvent.original.content['m.relates_to'].event_id === event.event_id;

    const editEvents = edits.get(event.event_id);
    const editedEvent = getLatestEditEvent(event, editEvents, redacted);
    const highlighted = focusItem?.eventId === event.event_id && focusItem.highlight;

    const reactionJSX = (reactionSenderTarget ||
      (reactionEvents && reactionEvents?.length > 0)) && (
      <Reactions
        style={{ marginTop: config.space.S200 }}
        roomId={roomId}
        reactions={reactionEvents ?? []}
        reactionSender={reactionSenderTarget ? reactionSender : undefined}
        eventId={event.event_id}
        canSendReaction={canSendReaction}
        canRedactReaction={canRedact || canDeleteOwn}
      />
    );

    const threadId = getThreadId(event);
    if (threadId) {
      const nextEvent: MessageEventWithoutRoomId | undefined = events[item + 1];
      if (nextEvent && getThreadId(nextEvent) === threadId) {
        threadSeries.push(event);
        return null;
      }
      threadSeries.push(event);
      const userNames = Array.from(
        new Set(threadSeries.map((ev) => membersAPI.getName(ev.sender)))
      );
      const threadReplyCounts = threadSeries.length;
      threadSeries = [];

      return (
        <ThreadEvents
          key={event.event_id}
          users={userNames}
          ts={event.origin_server_ts}
          messageLayout={messageLayout}
          hour24Clock={hour24Clock}
          dateFormatString={dateFormatString}
          messageSpacing={messageSpacing}
          count={threadReplyCounts}
          onClick={() => handleOpenThread(threadId)}
        />
      );
    }

    const replyEventId = getReplyId(event.content);

    const replyJSX =
      !getThreadId(event) && replyEventId ? (
        <Reply
          roomId={roomId}
          eventId={replyEventId}
          onClick={handleOpenEvent}
          onUserClick={handleUserClick}
          getMemberPowerTag={getMemberPowerTag}
          accessibleTagColors={accessiblePowerTagColors}
          legacyUsernameColor={legacyUsernameColor || direct}
          getMemberName={membersAPI.getName}
          timeline={timeline}
          htmlReactParserOptions={htmlReactParserInlineOptions}
          linkifyOpts={linkifyOpts}
        />
      ) : null;

    const threadTimeline = threads.get(event.event_id);

    return (
      <Message
        key={event.event_id}
        data-message-item={item}
        data-message-id={event.event_id}
        data-sender-id={event.sender}
        event={event}
        membersAPI={membersAPI}
        messageSpacing={messageSpacing}
        messageLayout={messageLayout}
        collapse={collapse}
        highlight={highlighted}
        selected={replyDraft?.eventId === event.event_id}
        edit={editId === event.event_id}
        canDelete={canRedact || (canDeleteOwn && event.sender === ct.session.userId)}
        canSendReaction={canSendReaction}
        canPinEvent={canPinEvent}
        canThread
        imagePackRooms={imagePackRooms}
        reactionEvents={reactionEvents && reactionEvents.length > 0 ? reactionEvents : undefined}
        onUserClick={handleUserClick}
        onUsernameClick={handleUsernameClick}
        onReplyClick={handleReplyClick}
        onThreadClick={handleThreadClick}
        onReactionToggle={handleAddReaction}
        onEditId={handleEdit}
        redacted={redacted.has(event.event_id)}
        hideReadReceipts={hideActivity}
        showDeveloperTools={developerTools}
        memberPowerTag={getMemberPowerTag(event.sender)}
        accessibleTagColors={accessiblePowerTagColors}
        legacyUsernameColor={legacyUsernameColor || direct}
        hour24Clock={hour24Clock}
        dateFormatString={dateFormatString}
      >
        {replyJSX}
        {redacted.has(event.event_id) ? (
          <RedactedContent />
        ) : (
          <MessageContent
            event={event}
            editedEvent={editedEvent}
            roomId={roomId}
            decryptionManager={ct.decryption}
          >
            {(contentEvent) =>
              editId === event.event_id ? (
                <MessageEditor
                  style={{ maxWidth: '100%', width: '100vw' }}
                  roomId={roomId}
                  event={contentEvent}
                  imagePackRooms={imagePackRooms}
                  onCancel={handleEdit}
                />
              ) : (
                <RenderMessageContent
                  displayName={membersAPI.getName(event.sender)}
                  eventType={contentEvent.type}
                  ts={event.origin_server_ts}
                  edited={!!editedEvent}
                  content={rContent.newContent(contentEvent.content) ?? contentEvent.content}
                  mediaAutoLoad={mediaAutoLoad}
                  urlPreview={showUrlPreview}
                  htmlReactParserOptions={htmlReactParserOptions}
                  linkifyOpts={linkifyOpts}
                  outlineAttachment={messageLayout === MessageLayout.Bubble}
                />
              )
            }
          </MessageContent>
        )}
        {reactionJSX}
        {threadTimeline && (
          <ThreadSelector
            active={threadTimeline.threadId === activeThread}
            thread={threadTimeline}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
            outlined={messageLayout === MessageLayout.Bubble}
            getMemberName={membersAPI.getName}
            getMemberAvatar={membersAPI.getAvatar}
            onClick={handleOpenThread}
          />
        )}
      </Message>
    );
  };

  const { getDayDivider, getNewDivider, updateDivider, clearDayDivider, clearNewDivider } =
    useEventDivider(markerTs);
  const { getCollapsed, updateCollapse } = useEventCollapse();

  const eventRenderer = (item: number) => {
    const event = events[item];

    if (!event) return null;

    if (event.sender && ignoredUsersSet.has(event.sender)) {
      return null;
    }
    if (redacted.has(event.event_id) && !showHiddenEvents) {
      return null;
    }

    const newDivider = getNewDivider(event) && event.sender !== ct.session.userId;
    const dayDivider = getDayDivider(event);

    const collapsed = getCollapsed(event, newDivider, dayDivider);

    const eventJSX = renderMatrixEvent(event, item, collapsed);
    updateCollapse(event, !!eventJSX);
    updateDivider(event);

    if (!eventJSX) return null;

    const dividerJSX =
      dayDivider || newDivider ? (
        <ComboDivider
          messageSpacing={messageSpacing}
          ts={dayDivider ? event.origin_server_ts : undefined}
          unread={newDivider}
          ref={newDivider ? observeNewDivider : undefined}
        />
      ) : null;

    if (newDivider && dividerJSX) clearNewDivider();
    if (dayDivider && dividerJSX) clearDayDivider();

    return (
      <React.Fragment key={event.event_id}>
        {dividerJSX}
        {eventJSX}
      </React.Fragment>
    );
  };

  return (
    <Box grow="Yes" style={{ position: 'relative' }}>
      <UnreadControls
        visible={!newDividerVisible}
        onJumpToUnread={handleJumpToUnread}
        onMarkAsRead={markAsRead}
      />
      <Scroll ref={scrollRef} visibility="Hover">
        <Box
          ref={timelineContainerRef}
          direction="Column"
          justifyContent="End"
          style={{ minHeight: '100%', padding: `${config.space.S600} 0` }}
        >
          {!!messageBatch.prev.end && rangeAtStart && (
            <div
              style={{
                padding: `${config.space.S700} ${config.space.S400} ${config.space.S600} ${
                  messageLayout === MessageLayout.Compact ? config.space.S400 : toRem(64)
                }`,
              }}
            >
              <RoomIntro name={getRoomName(roomId) ?? 'Unknown'} avatar={getRoomAvatar(roomId)} />
            </div>
          )}
          {(!messageBatch.prev.end || !rangeAtStart) && (
            <PlaceholderList
              ref={observeBackAnchor}
              count={5}
              Placeholder={
                messageLayout === MessageLayout.Compact ? CompactPlaceholder : DefaultPlaceholder
              }
            />
          )}
          {!eventLoading && getItems().map(eventRenderer)}
          {(!messageBatch.next.end || !rangeAtEnd) && (
            <PlaceholderList
              ref={observeFrontAnchor}
              count={5}
              Placeholder={
                messageLayout === MessageLayout.Compact ? CompactPlaceholder : DefaultPlaceholder
              }
            />
          )}

          {rangeAtEnd && messageBatch.next.end && (
            <>
              <OutboxView
                senders={localEventSenders}
                messageBatch={messageBatch}
                membersAPI={membersAPI}
                messageLayout={messageLayout}
                messageSpacing={messageSpacing}
                onUserClick={handleUserClick}
                onUsernameClick={handleUsernameClick}
                getMemberPowerTag={getMemberPowerTag}
                accessibleTagColors={accessiblePowerTagColors}
                legacyUsernameColor={legacyUsernameColor || direct}
                mediaAutoLoad={mediaAutoLoad}
                urlPreview={showUrlPreview}
                htmlReactParserOptions={htmlReactParserOptions}
                linkifyOpts={linkifyOpts}
              />
              <RoomViewTyping />
            </>
          )}
          <span ref={atBottomAnchorRef} />
        </Box>
      </Scroll>
      {!atBottomLazy && (
        <TimelineFloat position="Bottom">
          <JumpToLatestButton getScrollElement={getScrollElement} />
        </TimelineFloat>
      )}
    </Box>
  );
}
