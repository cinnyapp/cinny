import React, {
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  Avatar,
  Box,
  Header,
  Icon,
  IconButton,
  Icons,
  Line,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  config,
  toRem,
} from 'folds';
import { MatrixEvent, Room, RoomEvent, Thread, ThreadEvent } from 'matrix-js-sdk';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { HTMLReactParserOptions } from 'html-react-parser';

import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useThreadUnreadCount } from '../../hooks/useThreadUnreadCount';
import { UnreadBadge } from '../../components/unread-badge';
import { getMatrixToRoomEvent } from '../../plugins/matrix-to';
import { getViaServers } from '../../plugins/via-servers';
import { copyToClipboard, scrollToBottom } from '../../utils/dom';
import { stopPropagation } from '../../utils/keyboard';

import * as css from './ThreadsDrawer.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useSetting, useSetSetting } from '../../state/hooks/settings';
import { settingsAtom, MessageLayout } from '../../state/settings';
import { selectedThreadAtom } from '../../state/room/threadSelection';
import {
  factoryRenderLinkifyWithMention,
  getReactCustomHtmlParser,
  LINKIFY_OPTS,
  makeMentionCustomProps,
  renderMatrixMention,
} from '../../plugins/react-custom-html-parser';
import { getMemberDisplayName, getEditedEvent } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useMentionClickHandler } from '../../hooks/useMentionClickHandler';
import { useSpoilerClickHandler } from '../../hooks/useSpoilerClickHandler';
import { useIsDirectRoom } from '../../hooks/useRoom';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useAccessiblePowerTagColors, useGetMemberPowerTag } from '../../hooks/useMemberPowerTag';
import { useRoomCreatorsTag } from '../../hooks/useRoomCreatorsTag';
import { usePowerLevelTags } from '../../hooks/usePowerLevelTags';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useTheme } from '../../hooks/useTheme';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { Message, EncryptedContent } from './message';
import {
  MessageNotDecryptedContent,
  MessageUnsupportedContent,
} from '../../components/message/content/FallbackContent';
import { RedactedContent } from '../../components/message/MsgTypeRenderers';
import ThreadReplyInput from './ThreadReplyInput';
import { RoomViewFollowingPlaceholder } from './RoomViewFollowing';
import { GetContentCallback, MessageEvent } from '../../../types/matrix/room';
import { ContainerColor } from '../../styles/ContainerColor.css';

function getSenderName(room: Room, userId: string): string {
  return getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;
}

function getThreadPreview(rootEvent: MatrixEvent | undefined): string {
  const body = rootEvent?.getContent().body;
  if (typeof body !== 'string') return '';
  return body;
}

function ThreadListItem({
  room,
  thread,
  onSelect,
}: {
  room: Room;
  thread: Thread;
  onSelect: (thread: Thread) => void;
}) {
  const unreadCount = useThreadUnreadCount(room, thread);
  const { rootEvent } = thread;
  const preview = getThreadPreview(rootEvent);
  const replyCount = Math.max(0, thread.length);

  return (
    <MenuItem
      style={{ padding: `0 ${config.space.S100}` }}
      variant="Background"
      radii="300"
      onClick={() => onSelect(thread)}
      before={
        <Avatar size="200">
          <Icon size="100" src={Icons.Thread} />
        </Avatar>
      }
    >
      <Box direction="Column" gap="100" grow="Yes">
        <Text size="B300" truncate>
          {preview || 'Thread'}
        </Text>
        <Box alignItems="Center" gap="100">
          <Text size="T200" priority="300">
            {replyCount} reply{replyCount === 1 ? '' : 's'}
          </Text>
          <Box shrink="No" alignItems="Center" style={{ marginLeft: 'auto' }}>
            {unreadCount > 0 && <UnreadBadge count={unreadCount} />}
          </Box>
        </Box>
      </Box>
    </MenuItem>
  );
}

function ThreadList({
  room,
  threads,
  onSelect,
  onClose,
}: {
  room: Room;
  threads: Thread[];
  onSelect: (thread: Thread) => void;
  onClose: () => void;
}) {
  return (
    <>
      <Header className={css.ThreadsDrawerHeader} variant="Background" size="600">
        <Box grow="Yes" alignItems="Center" gap="200">
          <Text size="H5" truncate>
            {`${threads.length} Thread${threads.length === 1 ? '' : 's'}`}
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
              <IconButton ref={triggerRef} variant="Background" onClick={onClose}>
                <Icon src={Icons.Cross} />
              </IconButton>
            )}
          </TooltipProvider>
        </Box>
      </Header>
      <Box className={css.ThreadDrawerContentBase} grow="Yes">
        <Scroll variant="Background" size="300" visibility="Hover" hideTrack>
          <Box className={css.ThreadDrawerContent} direction="Column" gap="100">
            {threads.length === 0 && (
              <Text style={{ padding: config.space.S300 }} align="Center">
                No Threads
              </Text>
            )}
            {threads.map((thread) => (
              <ThreadListItem
                key={thread.id}
                room={room}
                thread={thread}
                onSelect={onSelect}
              />
            ))}
          </Box>
        </Scroll>
      </Box>
    </>
  );
}

function ThreadMessages({
  room,
  thread,
  onEventsCount,
}: {
  room: Room;
  thread: Thread;
  onEventsCount?: (count: number) => void;
}) {
  const mx = useMatrixClient();
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
  const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');
  const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
  const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
  const [encUrlPreview] = useSetting(settingsAtom, 'encUrlPreview');
  const showUrlPreview = room.hasEncryptionStateEvent() ? encUrlPreview : urlPreview;
  const [showDeveloperTools] = useSetting(settingsAtom, 'developerTools');
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');
  const useAuthentication = useMediaAuthentication();
  const direct = useIsDirectRoom();
  const [legacyUsernameColor] = useSetting(settingsAtom, 'legacyUsernameColor');
  const legacyUsernameColorFinal = legacyUsernameColor || direct;
  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);
  const creatorsTag = useRoomCreatorsTag();
  const powerLevelTags = usePowerLevelTags(room, powerLevels);
  const getMemberPowerTag = useGetMemberPowerTag(room, creators, powerLevels);
  const theme = useTheme();
  const accessiblePowerTagColors = useAccessiblePowerTagColors(
    theme.kind,
    creatorsTag,
    powerLevelTags
  );

  const mentionClickHandler = useMentionClickHandler(room.roomId);
  const spoilerClickHandler = useSpoilerClickHandler();

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

  // Authentic thread data model: the room re-emits the thread timeline set's
  // RoomEvent.Timeline / TimelineRefresh / Redaction (and thread events). React
  // to those SDK events to re-render — this is the same event-driven model
  // RoomTimeline uses, not polling. A thread created from the server thread list
  // starts with few/no events loaded, so backfill by paginating its timeline.
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only re-render when the event actually belongs to this thread's timeline
    // set (the room re-emits it with the event as first arg).
    const inThread = (mEvent?: MatrixEvent | null) =>
      !!thread.timelineSet &&
      !!mEvent &&
      (!!mEvent.getThread() ||
        thread.timelineSet
          .getLiveTimeline()
          .getEvents()
          .some((e) => e.getId() === mEvent.getId()));
    const onTimeline: (
      mEvent: MatrixEvent,
      eventRoom?: Room | null,
      toStart?: boolean,
      removed?: boolean,
      data?: object
    ) => void = (mEvent) => {
      if (inThread(mEvent)) setRevision((r) => r + 1);
    };
    const onRefresh: (r: { roomId: string }) => void = ({ roomId }) => {
      if (roomId === room.roomId) setRevision((r) => r + 1);
    };
    const onRedaction: (mEvent: MatrixEvent, eventRoom?: Room | null) => void = (mEvent) => {
      if (inThread(mEvent)) setRevision((r) => r + 1);
    };

    room.on(RoomEvent.Timeline as never, onTimeline as never);
    room.on(RoomEvent.TimelineRefresh as never, onRefresh as never);
    room.on(RoomEvent.Redaction as never, onRedaction as never);
    return () => {
      room.off(RoomEvent.Timeline as never, onTimeline as never);
      room.off(RoomEvent.TimelineRefresh as never, onRefresh as never);
      room.off(RoomEvent.Redaction as never, onRedaction as never);
    };
  }, [room, thread]);

  useEffect(() => {
    let cancelled = false;
    const timeline = thread.timelineSet.getLiveTimeline();
    const backfill = async () => {
      setLoading(true);
      try {
        // Keep pulling older events until the thread's history is exhausted.
        // Each paginate call advances the thread timeline token, so it must run
        // sequentially (hence the awaited loop). Always run to exhaustion even
        // if some events are already loaded from sync — a thread with 73
        // replies may only have its 8 most-recent events locally, and skipping
        // backfill here would leave the rest unrendered.
        // eslint-disable-next-line no-constant-condition
        while (!cancelled) {
          // eslint-disable-next-line no-await-in-loop
          const hasMore = await mx.paginateEventTimeline(timeline, { backwards: true, limit: 50 });
          if (!hasMore) break;
        }
      } catch {
        // ignore pagination errors (e.g. decrypt in progress)
      } finally {
        if (!cancelled) {
          setRevision((r) => r + 1);
          setLoading(false);
        }
      }
    };
    backfill();
    return () => {
      cancelled = true;
    };
  }, [mx, thread]);

  const events = useMemo(() => {
    const live: MatrixEvent[] = thread.timelineSet.getLiveTimeline().getEvents();
    const root = thread.rootEvent;
    const rootId = root?.getId();
    // Some thread timeline sets already contain the root event (e.g. after
    // backfill via the /messages thread filter) while others do not. Prepend
    // the root once, but only when it is not already present, to avoid the
    // root message rendering twice.
    const alreadyHasRoot = !!rootId && live.some((m) => m.getId() === rootId);
    let withRoot: MatrixEvent[];
    if (alreadyHasRoot || !root) {
      withRoot = live;
    } else {
      withRoot = [root, ...live];
    }
    return withRoot.filter(
      (m: MatrixEvent) =>
        m.getType() === MessageEvent.RoomMessage ||
        m.getType() === MessageEvent.RoomMessageEncrypted ||
        m.getType() === MessageEvent.Sticker
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread, revision]);

  // Notify the parent (ThreadDetail) whenever the rendered event count changes
  // so it can scroll the thread view to the bottom on a new reply (local or
  // remote echo) — mirroring RoomTimeline's auto-scroll-to-latest behavior.
  useEffect(() => {
    onEventsCount?.(events.length);
  }, [events.length, onEventsCount]);

  const onUserClick: MouseEventHandler<HTMLButtonElement> = useCallback((evt) => {
    evt.preventDefault();
    evt.stopPropagation();
  }, []);
  const onReplyClick: MouseEventHandler<HTMLButtonElement> = useCallback((evt) => {
    evt.preventDefault();
  }, []);
  const onReactionToggle = useCallback(() => undefined, []);

  if (loading) {
    return (
      <Box
        direction="Column"
        alignItems="Center"
        justifyContent="Center"
        style={{ padding: config.space.S400 }}
      >
        <Spinner variant="Secondary" size="400" />
      </Box>
    );
  }

  if (events.length === 0) {
    return (
      <Text style={{ padding: config.space.S300 }} align="Center">
        No Messages
      </Text>
    );
  }

  return (
    <Box direction="Column" gap="100">
      {events.map((mEvent: MatrixEvent) => {
        const senderId = mEvent.getSender() ?? '';
        const senderDisplayName = getSenderName(room, senderId);
        const eventId = mEvent.getId();
        const editedEvent = eventId ? getEditedEvent(eventId, mEvent, thread.timelineSet) : undefined;
        const getContent = (() =>
          editedEvent?.getContent()['m.new_content'] ?? mEvent.getContent()) as unknown as GetContentCallback;
        const eventType = mEvent.getType();

        return (
          <Message
            key={mEvent.getId()}
            data-message-id={mEvent.getId()}
            room={room}
            mEvent={mEvent}
            collapse={false}
            highlight={false}
            messageLayout={messageLayout}
            messageSpacing={messageSpacing}
            onUserClick={onUserClick}
            onUsernameClick={onUserClick}
            onReplyClick={onReplyClick}
            onReactionToggle={onReactionToggle}
            hideReadReceipts={hideActivity}
            showDeveloperTools={showDeveloperTools}
            memberPowerTag={getMemberPowerTag(senderId)}
            accessibleTagColors={accessiblePowerTagColors}
            legacyUsernameColor={legacyUsernameColorFinal}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          >
            {eventType === MessageEvent.RoomMessageEncrypted ? (
              <EncryptedContent mEvent={mEvent}>
                {() => {
                  if (mEvent.isRedacted()) return <RedactedContent />;
                  // After decryption the event type may flip to m.room.message —
                  // render it as a normal message if so.
                  if (mEvent.getType() === MessageEvent.RoomMessage) {
                    return (
                      <RenderMessageContent
                        displayName={senderDisplayName}
                        msgType={mEvent.getContent().msgtype ?? ''}
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
                  if (mEvent.getType() === MessageEvent.RoomMessageEncrypted)
                    return (
                      <Text>
                        <MessageNotDecryptedContent />
                      </Text>
                    );
                  return (
                    <Text>
                      <MessageUnsupportedContent />
                    </Text>
                  );
                }}
              </EncryptedContent>
            ) : (
              <RenderMessageContent
                displayName={senderDisplayName}
                msgType={mEvent.getContent().msgtype ?? ''}
                ts={mEvent.getTs()}
                edited={!!editedEvent}
                getContent={getContent}
                mediaAutoLoad={mediaAutoLoad}
                urlPreview={showUrlPreview}
                htmlReactParserOptions={htmlReactParserOptions}
                linkifyOpts={linkifyOpts}
                outlineAttachment={messageLayout === MessageLayout.Bubble}
              />
            )}
          </Message>
        );
      })}
    </Box>
  );
}

function ThreadMenu({
  room,
  thread,
  onViewInThread,
}: {
  room: Room;
  thread: Thread;
  onViewInThread: () => void;
}) {
  const mx = useMatrixClient();
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();
  const rootEventId = thread.rootEvent?.getId();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  const handleClose = () => setMenuAnchor(undefined);

  // Mark all replies in this thread as read by sending a *threaded* read
  // receipt on the thread's latest event (sendReadReceipt adds thread_id for
  // thread events while supportsThreads is on). The server echoes the receipt
  // back, which clears the thread's unread notification count and flips
  // hasUserReadEvent so the unread indicators (list pill + timeline summary)
  // clear without a reload.
  const handleMarkAsRead = () => {
    handleClose();
    const lastEvent = thread.replyToEvent ?? thread.lastReply();
    if (lastEvent) mx.sendReadReceipt(lastEvent);
  };

  const handleViewInThread = () => {
    handleClose();
    onViewInThread();
  };

  const handleCopyLink = () => {
    if (!rootEventId) return;
    copyToClipboard(getMatrixToRoomEvent(room.roomId, rootEventId, getViaServers(room)));
    handleClose();
  };

  return (
    <>
      <IconButton
        variant="Background"
        aria-pressed={!!menuAnchor}
        onClick={handleOpenMenu}
        aria-label="Thread options"
      >
        <Icon size="400" src={Icons.VerticalDots} filled={!!menuAnchor} />
      </IconButton>
      <PopOut
        anchor={menuAnchor}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => setMenuAnchor(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
              isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu style={{ maxWidth: toRem(160), width: '100vw' }}>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <MenuItem
                  onClick={handleMarkAsRead}
                  size="300"
                  after={<Icon size="100" src={Icons.CheckTwice} />}
                  radii="300"
                >
                  <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                    Mark as Read
                  </Text>
                </MenuItem>
                <MenuItem
                  onClick={handleViewInThread}
                  size="300"
                  after={<Icon size="100" src={Icons.Thread} />}
                  radii="300"
                >
                  <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                    View in Thread
                  </Text>
                </MenuItem>
              </Box>
              <Line variant="Surface" size="300" />
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <MenuItem
                  onClick={handleCopyLink}
                  size="300"
                  after={<Icon size="100" src={Icons.Link} />}
                  radii="300"
                >
                  <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                    Copy Link
                  </Text>
                </MenuItem>
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </>
  );
}

function ThreadDetail({
  room,
  thread,
  onBack,
  onClose,
}: {
  room: Room;
  thread: Thread;
  onBack: () => void;
  onClose: () => void;
}) {
  const { rootEvent } = thread;
  const senderId = rootEvent?.getSender() ?? '';
  const title =
    getThreadPreview(rootEvent) || (senderId ? getSenderName(room, senderId) : 'Thread');
  const { navigateRoom } = useRoomNavigate();
  const mx = useMatrixClient();

  // Mark the thread as read when it is opened: send a *threaded* read receipt
  // on the thread's latest event (sendReadReceipt adds thread_id for thread
  // events). The echoed receipt clears the thread's unread count and flips
  // hasUserReadEvent, so the list count-pill and the timeline summary clear
  // without a reload once the user has caught up.
  useEffect(() => {
    const lastEvent = thread.replyToEvent ?? thread.lastReply();
    if (lastEvent) mx.sendReadReceipt(lastEvent);
  }, [mx, thread]);

  // Auto-scroll the thread message view to the bottom whenever a new reply
  // arrives (the event count grows) so the viewer sees their freshly sent
  // reply and incoming replies without manual scrolling — mirroring the main
  // timeline's scroll-to-latest behavior.
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevEventCountRef = useRef<number>(-1);
  const handleEventsCount = useCallback((count: number) => {
    if (count > prevEventCountRef.current) {
      const el = scrollRef.current;
      if (el) scrollToBottom(el, 'auto');
    }
    prevEventCountRef.current = count;
  }, []);

  const handleViewInThread = () => {
    // Navigate to the room with the root (thread-starting) event focused so the
    // main timeline scrolls to and highlights the parent message, then close
    // the panel so the main timeline is visible.
    const rootEventId = thread.rootEvent?.getId();
    if (rootEventId) navigateRoom(room.roomId, rootEventId);
    onClose();
  };

  return (
    <>
      <Header className={css.ThreadsDrawerDetailHeader} variant="Background" size="600">
        <TooltipProvider
          position="Bottom"
          align="Start"
          offset={4}
          tooltip={
            <Tooltip>
              <Text>Back to Threads</Text>
            </Tooltip>
          }
        >
          {(triggerRef) => (
            <IconButton ref={triggerRef} variant="Background" onClick={onBack}>
              <Icon size="300" src={Icons.ArrowLeft} />
            </IconButton>
          )}
        </TooltipProvider>
        <Box grow="Yes">
          <Text size="H5" truncate>
            {title}
          </Text>
        </Box>
        <ThreadMenu room={room} thread={thread} onViewInThread={handleViewInThread} />
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
            <IconButton ref={triggerRef} variant="Background" onClick={onClose}>
              <Icon src={Icons.Cross} />
            </IconButton>
          )}
        </TooltipProvider>
      </Header>
      <Box className={css.ThreadDrawerContentBase} grow="Yes">
        <Scroll ref={scrollRef} variant="Background" size="300" visibility="Always" hideTrack={false}>
          <Box className={css.ThreadDrawerContent} direction="Column" gap="100">
            <ThreadMessages room={room} thread={thread} onEventsCount={handleEventsCount} />
          </Box>
        </Scroll>
      </Box>
      <Box shrink="No" direction="Column">
        <ThreadReplyInput room={room} thread={thread} />
        <RoomViewFollowingPlaceholder />
      </Box>
    </>
  );
}

type ThreadsDrawerProps = {
  room: Room;
};

const DEFAULT_THREAD_DRAWER_WIDTH = 400;
const MIN_THREAD_DRAWER_WIDTH = 320;
const MAX_THREAD_DRAWER_WIDTH = 640;
const THREAD_DRAWER_WIDTH_KEY = 'cinny.threadsDrawerWidth';

function readStoredWidth(): number {
  try {
    const raw = Number.parseInt(localStorage.getItem(THREAD_DRAWER_WIDTH_KEY) ?? '', 10);
    if (Number.isNaN(raw)) return DEFAULT_THREAD_DRAWER_WIDTH;
    return Math.min(MAX_THREAD_DRAWER_WIDTH, Math.max(MIN_THREAD_DRAWER_WIDTH, raw));
  } catch {
    return DEFAULT_THREAD_DRAWER_WIDTH;
  }
}

export function ThreadsDrawer({ room }: ThreadsDrawerProps) {
  const setThreadsDrawer = useSetSetting(settingsAtom, 'threadsDrawer');
  const bootSelection = useAtomValue(selectedThreadAtom);
  const setBootSelection = useSetAtom(selectedThreadAtom);
  const [selectedThread, setSelectedThread] = useState<Thread>();
  const [threads, setThreads] = useState<Thread[]>(() => room.getThreads());
  const [drawerWidth, setDrawerWidth] = useState<number>(readStoredWidth);
  const [isResizing, setIsResizing] = useState(false);

  // If the timeline's thread summary opened a specific thread, select it here
  // (and clear the request so a later drawer-open starts at the list).
  useEffect(() => {
    if (bootSelection?.roomId === room.roomId && bootSelection.threadId) {
      const thread = room.getThread(bootSelection.threadId);
      if (thread) {
        setSelectedThread(thread);
        setBootSelection(undefined);
      }
    }
  }, [bootSelection, room, setBootSelection]);

  // Persist the resized width so it survives reloads.
  useEffect(() => {
    try {
      localStorage.setItem(THREAD_DRAWER_WIDTH_KEY, String(drawerWidth));
    } catch {
      // ignore storage failures (private mode / quota)
    }
  }, [drawerWidth]);

  // Pointer-based resizing: dragging changes the width until the pointer is
  // released. Listeners attach on the window only while resizing is active.
  const startResize = useCallback((evt: React.PointerEvent<HTMLElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;
    const onMove = (evt: PointerEvent) => {
      // The drawer's right edge is pinned at the viewport right; dragging left
      // grows the drawer, dragging right shrinks it.
      const width = window.innerWidth - evt.clientX;
      setDrawerWidth(Math.min(MAX_THREAD_DRAWER_WIDTH, Math.max(MIN_THREAD_DRAWER_WIDTH, width)));
    };
    const onUp = () => {
      setIsResizing(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const update = () => setThreads(room.getThreads());

    const handleNewReply = () => update();
    const handleUpdate = () => update();
    const handleDelete = () => update();

    room.on(ThreadEvent.NewReply as never, handleNewReply as never);
    room.on(ThreadEvent.Update as unknown as never, handleUpdate as never);
    room.on(ThreadEvent.New as never, handleNewReply as never);
    room.on(ThreadEvent.Delete as never, handleDelete as never);

    // Bootstrap the full server-side thread list for this room. room.getThreads()
    // only reflects threads already in the locally-loaded timeline; the SDK's
    // fetchRoomThreads() (enabled by threadSupport) pulls the complete /threads
    // list, registers every root into room.threads (firing ThreadEvent.New), and
    // sets threadsReady. We keep a local copy and refresh from room.getThreads().
    let cancelled = false;
    room
      .fetchRoomThreads()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) update();
      });

    return () => {
      cancelled = true;
      room.off(ThreadEvent.NewReply as never, handleNewReply as never);
      room.off(ThreadEvent.Update as unknown as never, handleUpdate as never);
      room.off(ThreadEvent.New as never, handleNewReply as never);
      room.off(ThreadEvent.Delete as never, handleDelete as never);
    };
  }, [room]);

  // refresh selected thread's content when it updates
  useEffect(() => {
    if (!selectedThread) return;
    const latest = room.getThread(selectedThread.id);
    if (latest && latest !== selectedThread) {
      setSelectedThread(latest);
    }
  }, [threads, selectedThread, room]);

  return (
    <Box shrink="No" direction="Row">
      <div
        className={css.ThreadsDrawerResizer}
        onPointerDown={startResize}
        style={{ cursor: isResizing ? 'col-resize' : undefined }}
      />
      <Box
        className={classNames(css.ThreadsDrawer, ContainerColor({ variant: 'Background' }))}
        style={{ width: toRem(drawerWidth) }}
        shrink="No"
        grow="Yes"
        direction="Column"
      >
        {selectedThread ? (
          <ThreadDetail
            room={room}
            thread={selectedThread}
            onClose={() => setThreadsDrawer(false)}
            onBack={() => {
              setSelectedThread(undefined);
              setBootSelection(undefined);
            }}
          />
        ) : (
          <ThreadList
            room={room}
            threads={threads}
            onSelect={(thread) => {
              setSelectedThread(thread);
              setBootSelection({ roomId: room.roomId, threadId: thread.id });
            }}
            onClose={() => setThreadsDrawer(false)}
          />
        )}
      </Box>
    </Box>
  );
}
