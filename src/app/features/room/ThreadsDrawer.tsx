import React, { MouseEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Header,
  Icon,
  IconButton,
  Icons,
  MenuItem,
  Scroll,
  Text,
  Tooltip,
  TooltipProvider,
  config,
} from 'folds';
import { MatrixEvent, Room, Thread, ThreadEvent } from 'matrix-js-sdk';
import classNames from 'classnames';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { HTMLReactParserOptions } from 'html-react-parser';

import * as css from './ThreadsDrawer.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useSetting, useSetSetting } from '../../state/hooks/settings';
import { settingsAtom, MessageLayout } from '../../state/settings';
import {
  factoryRenderLinkifyWithMention,
  getReactCustomHtmlParser,
  LINKIFY_OPTS,
  makeMentionCustomProps,
  renderMatrixMention,
} from '../../plugins/react-custom-html-parser';
import { getMemberDisplayName } from '../../utils/room';
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
import { Message } from './message';
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
            {threads.map((thread) => {
              const { rootEvent } = thread;
              const senderId = rootEvent?.getSender() ?? '';
              const sender = senderId ? getSenderName(room, senderId) : 'Unknown';
              const preview = getThreadPreview(rootEvent);
              const replyCount = Math.max(0, thread.length);

              return (
                <MenuItem
                  key={thread.id}
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
                    <Box alignItems="Center" gap="100">
                      <Text size="B300" truncate>
                        {sender}
                      </Text>
                      <Text size="B300" priority="300" truncate>
                        {preview}
                      </Text>
                      {replyCount > 0 && (
                        <Text size="T200" priority="300">
                          {replyCount}
                        </Text>
                      )}
                    </Box>
                  </Box>
                </MenuItem>
              );
            })}
          </Box>
        </Scroll>
      </Box>
    </>
  );
}

function ThreadMessages({ room, thread }: { room: Room; thread: Thread }) {
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

  const events = useMemo(() => {
    const live: MatrixEvent[] = thread.timelineSet.getLiveTimeline().getEvents();
    const root = thread.rootEvent;
    const withRoot = root ? [root, ...live] : live;
    return withRoot.filter((m: MatrixEvent) => m.getType() === MessageEvent.RoomMessage);
  }, [thread]);

  const onUserClick: MouseEventHandler<HTMLButtonElement> = useCallback((evt) => {
    evt.preventDefault();
    evt.stopPropagation();
  }, []);
  const onReplyClick: MouseEventHandler<HTMLButtonElement> = useCallback((evt) => {
    evt.preventDefault();
  }, []);
  const onReactionToggle = useCallback(() => undefined, []);

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
        const getContent = (() => mEvent.getContent()) as unknown as GetContentCallback;

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
            <RenderMessageContent
              displayName={senderDisplayName}
              msgType={mEvent.getContent().msgtype ?? ''}
              ts={mEvent.getTs()}
              edited={false}
              getContent={getContent}
              mediaAutoLoad={mediaAutoLoad}
              urlPreview={showUrlPreview}
              htmlReactParserOptions={htmlReactParserOptions}
              linkifyOpts={linkifyOpts}
              outlineAttachment={messageLayout === MessageLayout.Bubble}
            />
          </Message>
        );
      })}
    </Box>
  );
}

function ThreadDetail({
  room,
  thread,
  onBack,
}: {
  room: Room;
  thread: Thread;
  onBack: () => void;
}) {
  const { rootEvent } = thread;
  const senderId = rootEvent?.getSender() ?? '';
  const title = senderId ? getSenderName(room, senderId) : 'Thread';

  return (
    <>
      <Box alignItems="Center" gap="100" className={css.ThreadsDrawerDetailHeader}>
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
      </Box>
      <Box className={css.ThreadDrawerContentBase} grow="Yes">
        <Scroll variant="Background" size="300" visibility="Always" hideTrack={false}>
          <Box className={css.ThreadDrawerContent} direction="Column" gap="100">
            <ThreadMessages room={room} thread={thread} />
          </Box>
        </Scroll>
      </Box>
    </>
  );
}

type ThreadsDrawerProps = {
  room: Room;
};

export function ThreadsDrawer({ room }: ThreadsDrawerProps) {
  const setThreadsDrawer = useSetSetting(settingsAtom, 'threadsDrawer');
  const [selectedThread, setSelectedThread] = useState<Thread>();
  const [threads, setThreads] = useState<Thread[]>(() => room.getThreads());

  useEffect(() => {
    const update = () => setThreads(room.getThreads());

    const handleNewReply = () => update();
    const handleUpdate = () => update();
    const handleDelete = () => update();

    room.on(ThreadEvent.NewReply as never, handleNewReply as never);
    room.on(ThreadEvent.Update as unknown as never, handleUpdate as never);
    room.on(ThreadEvent.New as never, handleNewReply as never);
    room.on(ThreadEvent.Delete as never, handleDelete as never);

    // Bootstrap the full server-side thread list for this room if the SDK
    // supports it. Populates room.getThreads() with threads that may not be
    // present in the locally-loaded timeline window yet.
    room
      .createThreadsTimelineSets()
      .then(update)
      .catch(() => undefined);

    return () => {
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
    <Box
      className={classNames(css.ThreadsDrawer, ContainerColor({ variant: 'Background' }))}
      shrink="No"
      direction="Column"
    >
      <Box grow="Yes" direction="Column">
        {selectedThread ? (
          <ThreadDetail
            room={room}
            thread={selectedThread}
            onBack={() => setSelectedThread(undefined)}
          />
        ) : (
          <ThreadList
            room={room}
            threads={threads}
            onSelect={setSelectedThread}
            onClose={() => setThreadsDrawer(false)}
          />
        )}
      </Box>
    </Box>
  );
}
