/* eslint-disable react/destructuring-assignment */
import React, {
  MouseEventHandler,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { HTMLReactParserOptions } from 'html-react-parser';
import { ReactEditor } from 'slate-react';
import { Editor } from 'slate';
import { Box, Scroll, config, toRem } from 'folds';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { useVirtualPaginator } from '../../hooks/useVirtualPaginator';
import { useAlive } from '../../hooks/useAlive';
import { scrollToBottom } from '../../utils/dom';
import {
  DefaultPlaceholder,
  CompactPlaceholder,
  Reply,
  RedactedContent,
} from '../../components/message';
import {
  factoryRenderLinkifyWithMention,
  getReactCustomHtmlParser,
  LINKIFY_OPTS,
  makeMentionCustomProps,
  renderMatrixMention,
} from '../../plugins/react-custom-html-parser';
import { getLatestEditEvent, getReplyId, getThreadId } from '../../utils/room';
import { useSetting } from '../../state/hooks/settings';
import { MessageLayout, settingsAtom } from '../../state/settings';
import { Reactions, Message, ThreadEvents } from './message';
import { RoomIntro } from '../../components/room-intro';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { MessageEvent, StateEvent } from '../../../types/matrix/room';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { useMentionClickHandler } from '../../hooks/useMentionClickHandler';
import { useSpoilerClickHandler } from '../../hooks/useSpoilerClickHandler';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
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
} from './hooks/useTimeline';
import { RoomViewTyping } from './RoomViewTyping';
import { rContent } from '../../../client/reader';
import { ThreadSelector } from './message/thread-selector';
import { TimelineFloat, JumpToLatestButton, ComboDivider, PlaceholderList } from './components';
import { OutboxView } from './OutboxView';
import { EncryptedMessageEvent } from '../../components/encrypted-event';

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
  const useAuthentication = useMediaAuthentication();
  const encryptedRooms = useObservableValue(ct.encryptedRooms);

  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
  const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');
  const [legacyUsernameColor] = useSetting(settingsAtom, 'legacyUsernameColor');
  const direct = useIsDirectRoom();
  const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
  const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
  const [encUrlPreview] = useSetting(settingsAtom, 'encUrlPreview');
  const showUrlPreview = encryptedRooms.has(roomId) ? encUrlPreview : urlPreview;
  const [showHiddenEvents] = useSetting(settingsAtom, 'showHiddenEvents');
  const [showDeveloperTools] = useSetting(settingsAtom, 'developerTools');

  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

  const ignoredUsersList = useIgnoredUsers();
  const ignoredUsersSet = useMemo(() => new Set(ignoredUsersList), [ignoredUsersList]);

  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(roomId);
  const [getRoomHeroes, roomToHeroMembersResult] = useRoomHeroes(roomId);
  const getRoomName = useGetRoomName(getRoomHeroes, roomToHeroMembersResult.value);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes, roomToHeroMembersResult.value);

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

  // const roomToParents = useAtomValue(roomToParentsAtom);
  // const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
  const { navigateRoom } = useRoomNavigate();
  const mentionClickHandler = useMentionClickHandler(roomId);
  const spoilerClickHandler = useSpoilerClickHandler();

  const imagePackRooms = useImagePackRooms(roomId);

  // const [unreadInfo, setUnreadInfo] = useState(() => getRoomUnreadInfo(room, true));
  const readUptoEventIdRef = useRef<string>();
  // if (unreadInfo) {
  //   readUptoEventIdRef.current = unreadInfo.readUptoEventId;
  // }

  const scrollRef = useRef<HTMLDivElement>(null);

  const [focusItem, setFocusItem] = useState<
    | {
        index: number;
        scrollTo: boolean;
        highlight: boolean;
      }
    | undefined
  >();
  const alive = useAlive();

  const linkifyOpts = useMemo<LinkifyOpts>(
    () => ({
      ...LINKIFY_OPTS,
      render: factoryRenderLinkifyWithMention((href) =>
        renderMatrixMention(
          ct,
          roomId,
          href,
          makeMentionCustomProps(mentionClickHandler),
          membersAPI.getName,
          getRoomName
        )
      ),
    }),
    [ct, roomId, mentionClickHandler, membersAPI.getName, getRoomName]
  );
  const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
    () =>
      getReactCustomHtmlParser(ct, roomId, {
        linkifyOpts,
        useAuthentication,
        handleSpoilerClick: spoilerClickHandler,
        handleMentionClick: mentionClickHandler,
        getMemberName: membersAPI.getName,
        getRoomName,
      }),
    [
      ct,
      roomId,
      linkifyOpts,
      spoilerClickHandler,
      mentionClickHandler,
      useAuthentication,
      membersAPI.getName,
      getRoomName,
    ]
  );

  const threads = useObservableValue(timeline.threads);
  const redacted = useObservableValue(timeline.relations.redacted);
  const reactions = useObservableValue(timeline.relations.reactions.eventToRelations);
  const edits = useObservableValue(timeline.relations.edits.eventToRelations);

  const messageBatch = useObservableValue(timeline.batch);
  const localEventSenders = useObservableValue(timeline.outbox.senders);
  const { events } = messageBatch.messages;

  window.t = timeline;

  const range = useObservableValue(timeline.range.info);
  const rangeAtStart = range.start === 0;
  const rangeAtEnd = range.end === messageBatch.size;

  const getScrollElement = useCallback(() => scrollRef.current, []);

  useTimelinePrefetch(timeline, PAGINATION_LIMIT);
  const handlePaginate = useTimelinePaginate(timeline, PAGINATION_LIMIT);
  useTimelineScrollRestore(timeline, scrollRef);
  useRestoreScrollToBottom(scrollRef, messageBatch);

  const { getItems, scrollToItem, scrollToElement, observeBackAnchor, observeFrontAnchor } =
    useVirtualPaginator({
      count: messageBatch.size,
      limit: PAGINATION_LIMIT,
      range,
      onRangeChange: useCallback((r) => timeline.range.setRange(r), [timeline]),
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
    console.log('mark as read.');
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
    useCallback(() => roomInputRef.current, [roomInputRef]),
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

  const stickToBottom = useCallback(() => {
    if (!atBottom) return;

    setTimeout(() => {
      const scrollEl = getScrollElement();
      if (scrollEl) {
        scrollToBottom(scrollEl, 'smooth');
      }
    }, 100);
  }, [getScrollElement, atBottom]);

  useObservableValueListener(timeline.outbox.senders, stickToBottom);
  useObservableValueListener(timeline.range.info, stickToBottom);

  const handleOpenReply: MouseEventHandler = useCallback(async (evt) => {
    const targetId = evt.currentTarget.getAttribute('data-event-id');
    if (!targetId) return;
    console.log(targetId);
  }, []);

  const handleUserClick = useUserClickHandler();
  const handleUsernameClick = useUsernameClickHandler(editor);
  const [replyDraft, handleReplyClick] = useReplyClickHandler(timeline, editor);

  const handleReactionToggle = useCallback((targetEventId: string) => {
    console.log(targetEventId);
  }, []);
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
      console.log(targetId);

      timeline.openThread(targetId);
    },
    [timeline]
  );

  console.log('========> RoomTimeline');
  console.log(range, events.length);

  let threadSeries: MessageEventWithoutRoomId[] = [];
  const renderMatrixEvent = (event: MessageEventWithoutRoomId, item: number, collapse: boolean) => {
    const reactionEvents = reactions.get(event.event_id)?.filter((r) => !redacted.has(r.event_id));
    const editEvents = edits.get(event.event_id);
    const editedEvent = editEvents && getLatestEditEvent(event.sender, editEvents, redacted);
    const highlighted = focusItem?.index === item && focusItem.highlight;

    const reactionJSX = reactionEvents && reactionEvents?.length > 0 && (
      <Reactions
        style={{ marginTop: config.space.S200 }}
        reactions={reactionEvents}
        eventId={event.event_id}
        canSendReaction={canSendReaction}
        onReactionToggle={handleReactionToggle}
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
        imagePackRooms={imagePackRooms}
        reactionEvents={reactionEvents && reactionEvents.length > 0 ? reactionEvents : undefined}
        onUserClick={handleUserClick}
        onUsernameClick={handleUsernameClick}
        onReplyClick={handleReplyClick}
        onThreadClick={handleThreadClick}
        onReactionToggle={handleReactionToggle}
        onEditId={handleEdit}
        redacted={redacted.has(event.event_id)}
        hideReadReceipts={hideActivity}
        showDeveloperTools={showDeveloperTools}
        memberPowerTag={getMemberPowerTag(event.sender)}
        accessibleTagColors={accessiblePowerTagColors}
        legacyUsernameColor={legacyUsernameColor || direct}
        hour24Clock={hour24Clock}
        dateFormatString={dateFormatString}
      >
        {redacted.has(event.event_id) && <RedactedContent />}
        {!redacted.has(event.event_id) &&
          ((editedEvent ?? event).type === MessageEvent.RoomMessageEncrypted ? (
            <EncryptedMessageEvent
              roomId={roomId}
              decryptionManager={ct.decryption}
              event={editedEvent ?? event}
            >
              {(decryptedEvent) => (
                <RenderMessageContent
                  displayName={membersAPI.getName(event.sender)}
                  eventType={decryptedEvent.type}
                  ts={event.origin_server_ts}
                  edited={!!editedEvent}
                  content={rContent.newContent(decryptedEvent.content) ?? decryptedEvent.content}
                  mediaAutoLoad={mediaAutoLoad}
                  urlPreview={showUrlPreview}
                  htmlReactParserOptions={htmlReactParserOptions}
                  linkifyOpts={linkifyOpts}
                  outlineAttachment={messageLayout === MessageLayout.Bubble}
                />
              )}
            </EncryptedMessageEvent>
          ) : (
            <RenderMessageContent
              displayName={membersAPI.getName(event.sender)}
              eventType={event.type}
              ts={event.origin_server_ts}
              edited={!!editedEvent}
              content={
                editedEvent
                  ? rContent.newContent(editedEvent.content) ?? editedEvent.content
                  : event.content
              }
              mediaAutoLoad={mediaAutoLoad}
              urlPreview={showUrlPreview}
              htmlReactParserOptions={htmlReactParserOptions}
              linkifyOpts={linkifyOpts}
              outlineAttachment={messageLayout === MessageLayout.Bubble}
            />
          ))}
        {reactionJSX}
        {threadTimeline && (
          <ThreadSelector
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
    useEventDivider(readUptoEventIdRef.current);
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

    const newDivider = getNewDivider() && event.sender !== ct.session.userId;
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
        />
      ) : null;

    if (newDivider && dividerJSX) clearNewDivider();
    if (dayDivider && dividerJSX) clearDayDivider();

    const replyEventId = getReplyId(event.content);

    const replyJSX =
      !getThreadId(event) && replyEventId ? (
        <Reply
          roomId={roomId}
          eventId={replyEventId}
          onClick={handleOpenReply}
          getMemberPowerTag={getMemberPowerTag}
          accessibleTagColors={accessiblePowerTagColors}
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
      ) : null;

    return (
      <React.Fragment key={event.event_id}>
        {dividerJSX}
        {replyJSX}
        {eventJSX}
      </React.Fragment>
    );
  };

  return (
    <Box grow="Yes" style={{ position: 'relative' }}>
      {/* {unreadInfo?.readUptoEventId && !unreadInfo?.inLiveTimeline && (
        <TimelineFloat position="Top">
          <Chip
            variant="Primary"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.MessageUnread} />}
            onClick={handleJumpToUnread}
          >
            <Text size="L400">Jump to Unread</Text>
          </Chip>

          <Chip
            variant="SurfaceVariant"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.CheckTwice} />}
            onClick={handleMarkAsRead}
          >
            <Text size="L400">Mark as Read</Text>
          </Chip>
        </TimelineFloat>
      )} */}
      <Scroll ref={scrollRef} visibility="Hover">
        <Box
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
          {getItems().map(eventRenderer)}
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
                redacted={redacted}
                messageLayout={messageLayout}
                messageSpacing={messageSpacing}
                onUserClick={handleUserClick}
                onUsernameClick={handleUsernameClick}
                getMemberPowerTag={getMemberPowerTag}
                accessibleTagColors={accessiblePowerTagColors}
                legacyUsernameColor={legacyUsernameColor || direct}
                mediaAutoLoad={mediaAutoLoad}
                urlPreview={showUrlPreview}
                hour24Clock={hour24Clock}
                dateFormatString={dateFormatString}
                htmlReactParserOptions={htmlReactParserOptions}
                linkifyOpts={linkifyOpts}
              />
              <RoomViewTyping />
            </>
          )}
          <span ref={atBottomAnchorRef} />
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
