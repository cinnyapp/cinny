import React, {
  forwardRef,
  MouseEventHandler,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { HTMLReactParserOptions } from 'html-react-parser';
import classNames from 'classnames';
import { ReactEditor } from 'slate-react';
import {
  Badge,
  Box,
  Icon,
  IconButton,
  Icons,
  Scroll,
  Text,
  Tooltip,
  TooltipProvider,
  config,
} from 'folds';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import FocusTrap from 'focus-trap-react';
import { useVirtualPaginator } from '../../../hooks/useVirtualPaginator';
import { useAlive } from '../../../hooks/useAlive';
import { scrollToBottom } from '../../../utils/dom';
import {
  DefaultPlaceholder,
  CompactPlaceholder,
  MessageBase,
  Reply,
} from '../../../components/message';
import {
  factoryRenderLinkifyWithMention,
  getReactCustomHtmlParser,
  LINKIFY_OPTS,
  makeMentionCustomProps,
  renderMatrixMention,
} from '../../../plugins/react-custom-html-parser';
import { fallbackReply, getLatestEditEvent, getReplyId } from '../../../utils/room';
import { useSetting } from '../../../state/hooks/settings';
import { MessageLayout, settingsAtom } from '../../../state/settings';
import { Reactions, Message } from '../message';
import * as css from './styles.css';
import { inSameDay, minuteDifference } from '../../../utils/time';
import { usePowerLevelsContext } from '../../../hooks/usePowerLevels';
import { MessageEvent, StateEvent } from '../../../../types/matrix/room';
import { RenderMessageContent } from '../../../components/RenderMessageContent';
import { useMentionClickHandler } from '../../../hooks/useMentionClickHandler';
import { useSpoilerClickHandler } from '../../../hooks/useSpoilerClickHandler';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
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
  useReplyClickHandler,
  useRestoreScrollToBottom,
  useTimelinePaginate,
  useTimelinePrefetch,
  useTimelineScrollRestore,
  useUserClickHandler,
  useUsernameClickHandler,
} from '../hooks/useTimeline';
import { rContent } from '../../../../client/reader';
import { Page, PageHeader } from '../../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useEditor } from '../../../components/editor';
import { TimelineDivider, TimelineFloat, JumpToLatestButton, DayDivider } from '../components';
import { RoomInput } from '../RoomInput';
import { RoomViewFollowingPlaceholder } from '../RoomViewFollowing';

type PlaceholderListProps = {
  count: number;
  Placeholder: React.ComponentType;
};

const PlaceholderList = forwardRef<HTMLDivElement, PlaceholderListProps>(
  ({ count, Placeholder }, ref) => (
    <div ref={ref}>
      {Array.from({ length: count }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <MessageBase key={i}>
          <Placeholder />
        </MessageBase>
      ))}
    </div>
  )
);

type ThreadViewProps = {
  threadTimeline: ThreadTimeline;
  requestClose: () => void;
};

const PAGINATION_LIMIT = 80;

export function ThreadView({ threadTimeline, requestClose }: ThreadViewProps) {
  const ct = useClient();
  const roomId = useRoom();
  const useAuthentication = useMediaAuthentication();
  const encryptedRooms = useObservableValue(ct.encryptedRooms);
  const screenSize = useScreenSizeContext();
  const floating = screenSize !== ScreenSize.Desktop;
  const editor = useEditor();
  const roomInputRef = useRef<HTMLDivElement>(null);
  const roomViewRef = useRef<HTMLDivElement>(null);

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
  const canSendReaction = permissions.event(MessageEvent.Reaction, ct.session.userId);
  const canPinEvent = permissions.stateEvent(StateEvent.RoomPinnedEvents, ct.session.userId);
  const [editId, setEditId] = useState<string>();

  const mentionClickHandler = useMentionClickHandler(roomId);
  const spoilerClickHandler = useSpoilerClickHandler();
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

  const redacted = useObservableValue(threadTimeline.relations.redacted);
  const reactions = useObservableValue(threadTimeline.relations.reactions.eventToRelations);
  const edits = useObservableValue(threadTimeline.relations.edits.eventToRelations);
  const messageBatch = useObservableValue(threadTimeline.batch);
  const { events } = messageBatch.messages;

  window.tt = threadTimeline;

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
    useCallback(() => roomInputRef?.current ?? null, [roomInputRef]),
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

  const handleOpenReply: MouseEventHandler = useCallback(async (evt) => {
    const targetId = evt.currentTarget.getAttribute('data-event-id');
    if (!targetId) return;
    console.log(targetId);
  }, []);

  const handleUserClick = useUserClickHandler();
  const handleUsernameClick = useUsernameClickHandler(editor);
  const [replyDraft, handleReplyClick] = useReplyClickHandler(
    threadTimeline,
    editor,
    threadTimeline.threadId
  );

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
      if (editor) {
        ReactEditor.focus(editor);
      }
    },
    [editor]
  );

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

    const content = editedEvent
      ? rContent.newContent(editedEvent.content) ?? event.content
      : event.content;

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
        canDelete={canRedact || event.sender === ct.session.userId}
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
        showDeveloperTools={showDeveloperTools}
        memberPowerTag={getMemberPowerTag(event.sender)}
        accessibleTagColors={accessiblePowerTagColors}
        legacyUsernameColor={legacyUsernameColor || direct}
        hour24Clock={hour24Clock}
        dateFormatString={dateFormatString}
      >
        <RenderMessageContent
          displayName={membersAPI.getName(event.sender)}
          eventType={event.type}
          ts={event.origin_server_ts}
          edited={!!editedEvent}
          content={content}
          mediaAutoLoad={mediaAutoLoad}
          urlPreview={showUrlPreview}
          htmlReactParserOptions={htmlReactParserOptions}
          linkifyOpts={linkifyOpts}
          outlineAttachment={messageLayout === MessageLayout.Bubble}
          redacted={redacted.has(event.event_id)}
        />
        {reactionJSX}
      </Message>
    );
  };

  let prevEvent: MessageEventWithoutRoomId | undefined;
  let isPrevRendered = false;
  let dayDivider = false;

  const eventRenderer = (item: number) => {
    const event = events[item];

    if (!event) return null;

    if (event.sender && ignoredUsersSet.has(event.sender)) {
      return null;
    }
    if (redacted.has(event.event_id) && !showHiddenEvents) {
      return null;
    }

    if (!dayDivider) {
      dayDivider = prevEvent
        ? !inSameDay(prevEvent.origin_server_ts, event.origin_server_ts)
        : false;
    }

    const collapsed =
      isPrevRendered &&
      !dayDivider &&
      prevEvent !== undefined &&
      prevEvent.sender === event.sender &&
      prevEvent.type === event.type &&
      minuteDifference(prevEvent.origin_server_ts, event.origin_server_ts) < 2 &&
      !getReplyId(event.content);

    const eventJSX = renderMatrixEvent(event, item, collapsed);
    prevEvent = event;
    isPrevRendered = !!eventJSX;

    const dayDividerJSX =
      dayDivider && eventJSX ? (
        <DayDivider ts={event.origin_server_ts} messageSpacing={messageSpacing} />
      ) : null;

    const replyEventId = getReplyId(event.content);

    const replyJSX =
      !fallbackReply(event.content) && replyEventId ? (
        <Reply
          roomId={roomId}
          eventId={replyEventId}
          onClick={handleOpenReply}
          getMemberPowerTag={getMemberPowerTag}
          accessibleTagColors={accessiblePowerTagColors}
          legacyUsernameColor={legacyUsernameColor || direct}
          redacted={redacted.has(replyEventId)}
          getMemberName={membersAPI.getName}
          timeline={threadTimeline}
          htmlReactParserOptions={htmlReactParserOptions}
          linkifyOpts={linkifyOpts}
          hour24Clock={hour24Clock}
          dateFormatString={dateFormatString}
          messageLayout={messageLayout}
          messageSpacing={messageSpacing}
        />
      ) : null;

    if (eventJSX && dayDividerJSX) {
      dayDivider = false;

      return (
        <React.Fragment key={event.event_id}>
          {dayDividerJSX}
          {replyJSX}
          {eventJSX}
        </React.Fragment>
      );
    }

    if (replyJSX) {
      return (
        <React.Fragment key={event.event_id}>
          {replyJSX}
          {eventJSX}
        </React.Fragment>
      );
    }

    return eventJSX;
  };

  return (
    <FocusTrap
      paused={!floating}
      focusTrapOptions={{
        initialFocus: false,
        clickOutsideDeactivates: true,
        onDeactivate: floating ? requestClose : undefined,
      }}
    >
      <Page
        className={classNames(css.ThreadView, {
          [css.ThreadViewFloating]: floating,
        })}
      >
        <PageHeader>
          <Box grow="Yes" alignItems="Center" gap="200">
            <Box grow="Yes">
              <Text size="H5" truncate>
                Thread
              </Text>
            </Box>
            <Box shrink="No" alignItems="Center">
              <TooltipProvider
                position="Bottom"
                align="End"
                offset={4}
                tooltip={
                  <Tooltip>
                    <Text>Close</Text>
                  </Tooltip>
                }
              >
                {(triggerRef) => (
                  <IconButton ref={triggerRef} variant="Surface" onClick={requestClose}>
                    <Icon src={Icons.Cross} />
                  </IconButton>
                )}
              </TooltipProvider>
            </Box>
          </Box>
        </PageHeader>

        <Box grow="Yes" style={{ position: 'relative' }}>
          <Scroll ref={scrollRef} visibility="Hover">
            <Box
              direction="Column"
              justifyContent="End"
              style={{ minHeight: '100%', padding: `${config.space.S600} 0` }}
            >
              {!messageBatch.prev.end || !rangeAtStart ? (
                <PlaceholderList
                  ref={observeBackAnchor}
                  count={5}
                  Placeholder={
                    messageLayout === MessageLayout.Compact
                      ? CompactPlaceholder
                      : DefaultPlaceholder
                  }
                />
              ) : (
                <MessageBase space={messageSpacing}>
                  <TimelineDivider variant="Surface">
                    <Badge as="span" size="500" variant="Secondary" fill="None" radii="300">
                      <Text size="L400">Replies</Text>
                    </Badge>
                  </TimelineDivider>
                </MessageBase>
              )}
              {getItems().map(eventRenderer)}
              {(!messageBatch.next.end || !rangeAtEnd) && (
                <PlaceholderList
                  ref={observeFrontAnchor}
                  count={5}
                  Placeholder={
                    messageLayout === MessageLayout.Compact
                      ? CompactPlaceholder
                      : DefaultPlaceholder
                  }
                />
              )}
              <span ref={atBottomAnchorRef} />
            </Box>
            <Box shrink="No" direction="Column" style={{ padding: `0 ${config.space.S400}` }}>
              <RoomInput
                editor={editor}
                fileDropContainerRef={roomViewRef}
                ref={roomInputRef}
                threadId={threadTimeline.threadId}
              />
              <RoomViewFollowingPlaceholder />
            </Box>
          </Scroll>
          {!atBottom && (
            <TimelineFloat position="Bottom">
              <JumpToLatestButton getScrollElement={getScrollElement} />
            </TimelineFloat>
          )}
        </Box>
      </Page>
    </FocusTrap>
  );
}
