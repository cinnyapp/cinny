import React, {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ReactEditor } from 'slate-react';
import { Box, Scroll, Text, config } from 'folds';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { useVirtualPaginator } from '../../../hooks/useVirtualPaginator';
import { useAlive } from '../../../hooks/useAlive';
import { scrollToBottom } from '../../../utils/dom';
import {
  DefaultPlaceholder,
  CompactPlaceholder,
  Reply,
  DividerTime,
  RedactedContent,
} from '../../../components/message';
import { fallbackReply, getLatestEditEvent, getReplyId } from '../../../utils/room';
import { useSettings } from '../../../state/hooks/settings';
import { MessageLayout } from '../../../state/settings';
import { Reactions, Message } from '../message';
import * as css from './styles.css';
import { usePowerLevelsContext } from '../../../hooks/usePowerLevels';
import { MessageEvent, StateEvent } from '../../../../types/matrix/room';
import { RenderMessageContent } from '../../../components/RenderMessageContent';
import { useIgnoredUsers } from '../../../hooks/useIgnoredUsers';
import { useImagePackRooms } from '../../../hooks/useImagePackRooms';
import { useIsDirectRoom, useRoom } from '../../../hooks/useRoom';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../../hooks/useRoomPermissions';
import {
  useAccessiblePowerTagColors,
  useGetMemberPowerTag,
} from '../../../hooks/useMemberPowerTag';
import { useTheme } from '../../../hooks/useTheme';
import { useRoomCreatorsTag } from '../../../hooks/useRoomCreatorsTag';
import { usePowerLevelTags, usePowerLevelTagsState } from '../../../hooks/usePowerLevelTags';
import { ThreadTimeline } from '../../../../client/room/ThreadTimeline';
import { useObservableValue } from '../../../hooks/useObservableValue';
import { useClient } from '../../../hooks/useClient';
import { useRoomMembersAPI } from '../../../hooks/useRoomMembers';
import { useGetRoomName } from '../../../hooks/storage/useGetRoomName';
import { useRoomHeroes } from '../../../hooks/storage/useRoomHeros';
import {
  useAtBottomToggle,
  useEditorResizeStickBottom,
  useEventCollapse,
  useEventDivider,
  useReplyClickHandler,
  useRestoreScrollToBottom,
  useTimelinePaginate,
  useTimelinePrefetch,
  useTimelineScrollRestore,
  useUserClickHandler,
  useUsernameClickHandler,
} from '../hooks/useTimeline';
import { rContent } from '../../../../client/reader';
import { useEditor } from '../../../components/editor';
import {
  TimelineFloat,
  JumpToLatestButton,
  ComboDivider,
  PlaceholderList,
  UnreadControls,
} from '../components';
import { OutboxView } from '../OutboxView';
import { useUserReadReceipt } from '../../../hooks/useReadReceipt';
import { useMessageParserOptions } from '../../../hooks/useMessageParserOptions';
import { MessageContent } from '../../../components/MessageContent';
import { MessageEditor } from '../message/MessageEditor';
import { useSendReaction } from '../hooks/useSendReaction';

type TimelineViewProps = {
  threadTimeline: ThreadTimeline;
  threadInputRef: RefObject<HTMLElement>;
};

const PAGINATION_LIMIT = 80;

export function TimelineView({ threadTimeline, threadInputRef }: TimelineViewProps) {
  const ct = useClient();
  const roomId = useRoom();
  const encryptedRooms = useObservableValue(ct.encryptedRooms);
  const editor = useEditor();

  const {
    hideActivity,
    messageLayout,
    messageSpacing,
    legacyUsernameColor,
    mediaAutoLoad,
    urlPreview,
    encUrlPreview,
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
  const scrollToBottomRef = useRef({
    count: 0,
    smooth: true,
  });

  const [focusItem, setFocusItem] = useState<
    | {
        index: number;
        scrollTo: boolean;
        highlight: boolean;
      }
    | undefined
  >();
  const alive = useAlive();

  const { linkifyOpts, htmlReactParserOptions, htmlReactParserInlineOptions } =
    useMessageParserOptions(roomId, getRoomName, membersAPI.getName);

  const redacted = useObservableValue(threadTimeline.relations.redacted);
  const reactions = useObservableValue(threadTimeline.relations.reactions.eventToRelations);
  const edits = useObservableValue(threadTimeline.relations.edits.eventToRelations);
  const messageBatch = useObservableValue(threadTimeline.batch);
  const localEventSenders = useObservableValue(threadTimeline.outbox.senders);
  const threadMeta = useObservableValue(threadTimeline.meta);
  const { events } = messageBatch.messages;

  const range = useObservableValue(threadTimeline.range.info);
  const rangeAtStart = range.start === 0;
  const rangeAtEnd = range.end === messageBatch.size;

  const getScrollElement = useCallback(() => scrollRef.current, []);

  useTimelinePrefetch(threadTimeline, PAGINATION_LIMIT);
  const handlePaginate = useTimelinePaginate(threadTimeline, PAGINATION_LIMIT);
  useTimelineScrollRestore(threadTimeline, scrollRef);
  useRestoreScrollToBottom(scrollRef, messageBatch);

  const { getItems, scrollToItem, scrollToElement, observeBackAnchor, observeFrontAnchor } =
    useVirtualPaginator({
      count: messageBatch.size,
      limit: PAGINATION_LIMIT,
      range,
      onRangeChange: useCallback((r) => threadTimeline.range.setRange(r), [threadTimeline]),
      getScrollElement,
      getItemElement: useCallback(
        (index: number) =>
          (scrollRef.current?.querySelector(`[data-message-item="${index}"]`) as HTMLElement) ??
          undefined,
        []
      ),
      onEnd: handlePaginate,
    });

  const tryAutoMarkAsRead = useCallback(() => {
    console.log('mark thread as read.');
  }, []);

  const [atBottom, atBottomAnchorRef] = useAtBottomToggle(
    getScrollElement,
    messageBatch.next.end ?? false,
    useCallback(
      (bottom: boolean) => {
        if (bottom && document.hasFocus()) {
          tryAutoMarkAsRead();
        }
      },
      [tryAutoMarkAsRead]
    )
  );

  useEditorResizeStickBottom(
    getScrollElement,
    useCallback(() => threadInputRef?.current ?? null, [threadInputRef]),
    atBottom
  );

  // scroll to focused message
  useLayoutEffect(() => {
    if (focusItem && focusItem.scrollTo) {
      scrollToItem(focusItem.index, {
        behavior: 'instant',
        align: 'center',
        stopInView: true,
      });
    }

    setTimeout(() => {
      if (!alive()) return;
      setFocusItem((currentItem) => {
        if (currentItem === focusItem) return undefined;
        return currentItem;
      });
    }, 2000);
  }, [alive, focusItem, scrollToItem]);

  // scroll to bottom of timeline
  const scrollToBottomCount = scrollToBottomRef.current.count;
  useLayoutEffect(() => {
    if (scrollToBottomCount > 0) {
      const scrollEl = scrollRef.current;
      if (scrollEl)
        scrollToBottom(scrollEl, scrollToBottomRef.current.smooth ? 'smooth' : 'instant');
    }
  }, [scrollToBottomCount]);

  // scroll out of view msg editor in view.
  useEffect(() => {
    if (editId) {
      const editMsgElement =
        (scrollRef.current?.querySelector(`[data-message-id="${editId}"]`) as HTMLElement) ??
        undefined;
      if (editMsgElement) {
        scrollToElement(editMsgElement, {
          align: 'center',
          behavior: 'smooth',
          stopInView: true,
        });
      }
    }
  }, [scrollToElement, editId]);

  const handleOpenReply = useCallback((replyId: string) => {
    console.log(replyId);
  }, []);

  const handleUserClick = useUserClickHandler();
  const handleUsernameClick = useUsernameClickHandler(editor);
  const [replyDraft, handleReplyClick] = useReplyClickHandler(editor, threadTimeline.threadId);

  const handleReactionToggle = useSendReaction();

  const handleEdit = useCallback(
    (editEvtId?: string) => {
      if (editEvtId) {
        setEditId(editEvtId);
        return;
      }
      setEditId(undefined);
      if (editor) {
        ReactEditor.focus(editor);
      }
    },
    [editor]
  );

  const renderMatrixEvent = (event: MessageEventWithoutRoomId, item: number, collapse: boolean) => {
    const reactionEvents = reactions.get(event.event_id)?.filter((r) => !redacted.has(r.event_id));
    const editEvents = edits.get(event.event_id);
    const editedEvent = getLatestEditEvent(event, editEvents, redacted);
    const highlighted = focusItem?.index === item && focusItem.highlight;

    const replyEventId = fallbackReply(event.content) ? undefined : getReplyId(event.content);
    const replyJSX = replyEventId ? (
      <Reply
        roomId={roomId}
        eventId={replyEventId}
        onClick={handleOpenReply}
        onUserClick={handleUserClick}
        getMemberPowerTag={getMemberPowerTag}
        accessibleTagColors={accessiblePowerTagColors}
        legacyUsernameColor={legacyUsernameColor || direct}
        getMemberName={membersAPI.getName}
        timeline={threadTimeline}
        htmlReactParserOptions={htmlReactParserInlineOptions}
        linkifyOpts={linkifyOpts}
      />
    ) : null;

    const reactionJSX = reactionEvents && reactionEvents?.length > 0 && (
      <Reactions
        style={{ marginTop: config.space.S200 }}
        roomId={roomId}
        reactions={reactionEvents}
        eventId={event.event_id}
        canSendReaction={canSendReaction}
        canRedactReaction={canRedact || canDeleteOwn}
      />
    );

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
        imagePackRooms={imagePackRooms}
        reactionEvents={reactionEvents && reactionEvents.length > 0 ? reactionEvents : undefined}
        onUserClick={handleUserClick}
        onUsernameClick={handleUsernameClick}
        onReplyClick={handleReplyClick}
        onReactionToggle={handleReactionToggle}
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
      </Message>
    );
  };

  const readReceipt = useUserReadReceipt(threadTimeline.threadId);
  const {
    getDayDivider,
    getThreadRootDivider,
    getNewDivider,
    updateDivider,
    clearDayDivider,
    clearNewDivider,
  } = useEventDivider(readReceipt?.ts);
  const { getCollapsed, updateCollapse } = useEventCollapse(threadTimeline.threadId);
  const eventRenderer = (event: MessageEventWithoutRoomId, item: number) => {
    if (event.sender && ignoredUsersSet.has(event.sender)) {
      return null;
    }

    const newDivider = getNewDivider(event) && event.sender !== ct.session.userId;
    const dayDivider = getDayDivider(event);
    const replyCount =
      threadMeta && getThreadRootDivider(threadMeta.rootEvent) ? threadMeta.replyCount : undefined;
    const collapsed = getCollapsed(event, newDivider, dayDivider);

    const eventJSX = renderMatrixEvent(event, item, collapsed);
    updateCollapse(event, !!eventJSX);
    updateDivider(event);

    if (!eventJSX) return null;

    const dividerJSX =
      dayDivider || replyCount ? (
        <ComboDivider
          messageSpacing={messageSpacing}
          ts={dayDivider ? event.origin_server_ts : undefined}
          replyCount={replyCount}
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
      {readReceipt && (
        <UnreadControls
          onJumpToUnread={() => threadTimeline.jumpToEvent(readReceipt.eventId)}
          onMarkAsRead={() => undefined}
        />
      )}
      <Scroll ref={scrollRef} size="0" visibility="Hover" hideTrack>
        <Box direction="Column" style={{ minHeight: '100%' }}>
          <Box
            grow="Yes"
            alignItems="Center"
            justifyContent="Center"
            direction="Column"
            className={css.ZigZagLine}
            style={{ padding: config.space.S700 }}
            gap="700"
          >
            <Box
              grow="Yes"
              alignItems="Center"
              justifyContent="Center"
              direction="Column"
              gap="300"
            >
              <Text size="H1">✦</Text>
              <Text size="L400">A Thread Begins</Text>
            </Box>
            <Text size="T200" align="Center">
              <DividerTime ts={threadMeta?.rootEvent.origin_server_ts ?? Date.now()} />
            </Text>
          </Box>
          <Box
            grow="No"
            direction="Column"
            justifyContent="Start"
            style={{
              padding: `${config.space.S600} ${config.space.S400} ${config.space.S600} 0`,
            }}
          >
            {!messageBatch.prev.end || !rangeAtStart || !threadMeta ? (
              <PlaceholderList
                ref={observeBackAnchor}
                count={5}
                Placeholder={
                  messageLayout === MessageLayout.Compact ? CompactPlaceholder : DefaultPlaceholder
                }
              />
            ) : (
              <>{eventRenderer(threadMeta.rootEvent, -1)}</>
            )}
            {getItems().map((item) => {
              const event = events[item];
              if (!event) return null;
              return eventRenderer(event, item);
            })}
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
            )}
            <span ref={atBottomAnchorRef} />
          </Box>
        </Box>
      </Scroll>
      {!atBottom && (
        <TimelineFloat position="Bottom">
          <JumpToLatestButton getScrollElement={getScrollElement} />
        </TimelineFloat>
      )}
    </Box>
  );
}
