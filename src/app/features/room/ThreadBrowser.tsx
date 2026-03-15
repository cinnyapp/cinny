import React, {
  ChangeEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Scroll,
  Text,
  Avatar,
  config,
  Chip,
} from 'folds';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { Thread, ThreadEvent } from 'matrix-js-sdk/lib/models/thread';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getMemberAvatarMxc, getMemberDisplayName, reactionOrEditEvent } from '../../utils/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { UserAvatar } from '../../components/user-avatar';
import {
  AvatarBase,
  ModernLayout,
  RedactedContent,
  Time,
  Username,
  UsernameBold,
  Reply,
} from '../../components/message';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { settingsAtom } from '../../state/settings';
import { useSetting } from '../../state/hooks/settings';
import { GetContentCallback } from '../../../types/matrix/room';
import { useMentionClickHandler } from '../../hooks/useMentionClickHandler';
import { useSpoilerClickHandler } from '../../hooks/useSpoilerClickHandler';
import {
  factoryRenderLinkifyWithMention,
  getReactCustomHtmlParser,
  LINKIFY_OPTS,
  makeMentionCustomProps,
  renderMatrixMention,
} from '../../plugins/react-custom-html-parser';
import { EncryptedContent } from './message';
import * as css from './ThreadDrawer.css';

type ThreadPreviewProps = {
  room: Room;
  thread: Thread;
  onClick: (threadId: string) => void;
};

function ThreadPreview({ room, thread, onClick }: ThreadPreviewProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const { navigateRoom } = useRoomNavigate();
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');
  const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
  const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
  const mentionClickHandler = useMentionClickHandler(room.roomId);
  const spoilerClickHandler = useSpoilerClickHandler();

  const linkifyOpts = useMemo<LinkifyOpts>(
    () => ({
      ...LINKIFY_OPTS,
      render: factoryRenderLinkifyWithMention((href: string) =>
        renderMatrixMention(mx, room.roomId, href, makeMentionCustomProps(mentionClickHandler))
      ),
    }),
    [mx, room.roomId, mentionClickHandler]
  );

  const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
    () =>
      getReactCustomHtmlParser(mx, room.roomId, {
        linkifyOpts,
        handleSpoilerClick: spoilerClickHandler,
        handleMentionClick: mentionClickHandler,
        useAuthentication,
      }),
    [mx, room, linkifyOpts, mentionClickHandler, spoilerClickHandler, useAuthentication]
  );

  const handleJumpClick: MouseEventHandler = useCallback(
    (evt) => {
      evt.stopPropagation();
      navigateRoom(room.roomId, thread.id);
    },
    [navigateRoom, room.roomId, thread.id]
  );

  const { rootEvent } = thread;
  if (!rootEvent) return null;

  const senderId = rootEvent.getSender() ?? '';
  const displayName =
    getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;
  const senderAvatarMxc = getMemberAvatarMxc(room, senderId);
  const getContent = (() => rootEvent.getContent()) as GetContentCallback;

  const replyCount = thread.events.filter(
    (ev: MatrixEvent) => ev.getId() !== thread.id && !reactionOrEditEvent(ev)
  ).length;

  const lastReply = thread.events
    .filter((ev: MatrixEvent) => ev.getId() !== thread.id && !reactionOrEditEvent(ev))
    .at(-1);
  const lastSenderId = lastReply?.getSender() ?? '';
  const lastDisplayName =
    getMemberDisplayName(room, lastSenderId) ?? getMxIdLocalPart(lastSenderId) ?? lastSenderId;
  const lastContent = lastReply?.getContent();
  const lastBody: string = typeof lastContent?.body === 'string' ? lastContent.body : '';

  return (
    <Box
      as="button"
      direction="Column"
      gap="100"
      className={css.ThreadBrowserItem}
      onClick={() => onClick(thread.id)}
    >
      <ModernLayout
        before={
          <AvatarBase>
            <Avatar size="300">
              <UserAvatar
                userId={senderId}
                src={
                  senderAvatarMxc
                    ? mxcUrlToHttp(mx, senderAvatarMxc, useAuthentication, 48, 48, 'crop') ??
                      undefined
                    : undefined
                }
                alt={displayName}
                renderFallback={() => <Icon size="200" src={Icons.User} filled />}
              />
            </Avatar>
          </AvatarBase>
        }
      >
        <Box gap="300" justifyContent="SpaceBetween" alignItems="Center" grow="Yes">
          <Box gap="200" alignItems="Baseline">
            <Username>
              <Text as="span" truncate>
                <UsernameBold>{displayName}</UsernameBold>
              </Text>
            </Username>
            <Time
              ts={rootEvent.getTs()}
              hour24Clock={hour24Clock}
              dateFormatString={dateFormatString}
            />
          </Box>
          <Box shrink="No">
            <Chip data-event-id={thread.id} onClick={handleJumpClick} radii="Pill">
              <Text size="T200">Jump</Text>
            </Chip>
          </Box>
        </Box>
        {rootEvent.replyEventId && (
          <Reply
            room={room}
            replyEventId={rootEvent.replyEventId}
            threadRootId={rootEvent.threadRootId}
            onClick={handleJumpClick}
          />
        )}
        <Box
          style={{
            maxHeight: '200px',
            overflow: 'auto',
            flexShrink: 0,
          }}
        >
          <EncryptedContent mEvent={rootEvent}>
            {() => {
              if (rootEvent.isRedacted()) {
                return <RedactedContent />;
              }

              return (
                <RenderMessageContent
                  displayName={displayName}
                  msgType={rootEvent.getContent().msgtype ?? ''}
                  ts={rootEvent.getTs()}
                  getContent={getContent}
                  edited={!!rootEvent.replacingEvent()}
                  mediaAutoLoad={mediaAutoLoad}
                  urlPreview={urlPreview}
                  htmlReactParserOptions={htmlReactParserOptions}
                  linkifyOpts={linkifyOpts}
                  outlineAttachment
                />
              );
            }}
          </EncryptedContent>
        </Box>
        {replyCount > 0 && (
          <Box gap="100" alignItems="Center" style={{ marginTop: config.space.S200 }}>
            <Text size="T200" priority="300" style={{ flexShrink: 0 }}>
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </Text>
            {lastReply && lastBody && (
              <Text
                size="T200"
                priority="300"
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                · {lastDisplayName}: {lastBody.slice(0, 60)}
              </Text>
            )}
          </Box>
        )}
      </ModernLayout>
    </Box>
  );
}

type ThreadBrowserProps = {
  room: Room;
  onOpenThread: (threadId: string) => void;
  onClose: () => void;
  overlay?: boolean;
};

export function ThreadBrowser({ room, onOpenThread, onClose, overlay }: ThreadBrowserProps) {
  const [, forceUpdate] = useState(0);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Re-render when threads change.
  useEffect(() => {
    const onUpdate = () => forceUpdate((n) => n + 1);
    room.on(ThreadEvent.New as any, onUpdate);
    room.on(ThreadEvent.Update as any, onUpdate);
    room.on(ThreadEvent.NewReply as any, onUpdate);
    return () => {
      room.off(ThreadEvent.New as any, onUpdate);
      room.off(ThreadEvent.Update as any, onUpdate);
      room.off(ThreadEvent.NewReply as any, onUpdate);
    };
  }, [room]);

  const allThreads = room.getThreads().sort((a: Thread, b: Thread) => {
    const aTs = a.events.at(-1)?.getTs() ?? a.rootEvent?.getTs() ?? 0;
    const bTs = b.events.at(-1)?.getTs() ?? b.rootEvent?.getTs() ?? 0;
    return bTs - aTs;
  });

  const lowerQuery = query.trim().toLowerCase();
  const threads = lowerQuery
    ? allThreads.filter((t: Thread) => {
        const body = t.rootEvent?.getContent()?.body ?? '';
        return typeof body === 'string' && body.toLowerCase().includes(lowerQuery);
      })
    : allThreads;

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setQuery(e.target.value);
  };

  return (
    <Box
      className={overlay ? css.ThreadDrawerOverlay : css.ThreadDrawer}
      direction="Column"
      shrink="No"
    >
      <Header className={css.ThreadDrawerHeader} variant="Background" size="600">
        <Box grow="Yes" alignItems="Center" gap="200">
          <Icon size="200" src={Icons.Thread} />
          <Text size="H5" truncate>
            Threads
          </Text>
        </Box>
        <Box alignItems="Center" gap="200" shrink="No">
          <Text size="T300" priority="300" truncate>
            # {room.name}
          </Text>
          <IconButton onClick={onClose} variant="Background" aria-label="Close threads">
            <Icon src={Icons.Cross} />
          </IconButton>
        </Box>
      </Header>

      <Box
        direction="Column"
        gap="100"
        style={{ padding: `${config.space.S200} ${config.space.S300}` }}
        shrink="No"
      >
        <Input
          ref={searchRef}
          value={query}
          onChange={handleSearchChange}
          placeholder="Search threads..."
          variant="Surface"
          size="400"
          radii="400"
          before={<Icon size="50" src={Icons.Search} />}
          after={
            query ? (
              <IconButton
                size="300"
                radii="300"
                variant="SurfaceVariant"
                onClick={() => {
                  setQuery('');
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <Icon size="50" src={Icons.Cross} />
              </IconButton>
            ) : undefined
          }
        />
      </Box>

      <Box className={css.ThreadDrawerContent} grow="Yes" direction="Column">
        <Scroll
          variant="Background"
          visibility="Hover"
          direction="Vertical"
          hideTrack
          style={{ flexGrow: 1 }}
        >
          {threads.length === 0 ? (
            <Box
              direction="Column"
              alignItems="Center"
              justifyContent="Center"
              style={{ padding: config.space.S400, gap: config.space.S200 }}
            >
              <Icon size="400" src={Icons.Thread} />
              <Text size="T300" align="Center">
                {lowerQuery ? 'No threads match your search.' : 'No threads yet.'}
              </Text>
            </Box>
          ) : (
            <Box
              direction="Column"
              style={{ padding: `${config.space.S100} ${config.space.S200}` }}
            >
              {threads.map((thread: Thread) => (
                <ThreadPreview key={thread.id} room={room} thread={thread} onClick={onOpenThread} />
              ))}
            </Box>
          )}
        </Scroll>
      </Box>
    </Box>
  );
}
