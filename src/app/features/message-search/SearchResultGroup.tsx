/* eslint-disable react/destructuring-assignment */
import React, { MouseEventHandler, useMemo } from 'react';
import { IEventWithRoomId, JoinRule, RelationType, Room } from 'matrix-js-sdk';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Avatar, Box, Chip, Header, Icon, Icons, Text, config } from 'folds';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  factoryRenderLinkifyWithMention,
  getReactCustomHtmlParser,
  LINKIFY_OPTS,
  makeHighlightRegex,
  makeMentionCustomProps,
  renderMatrixMention,
} from '../../plugins/react-custom-html-parser';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { useMatrixEventRenderer } from '../../hooks/useMatrixEventRenderer';
import { GetContentCallback, MessageEvent, StateEvent } from '../../../types/matrix/room';
import {
  AvatarBase,
  ImageContent,
  MSticker,
  ModernLayout,
  RedactedContent,
  Reply,
  Time,
  Username,
} from '../../components/message';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { Image } from '../../components/media';
import { ImageViewer } from '../../components/image-viewer';
import * as customHtmlCss from '../../styles/CustomHtml.css';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { getMemberAvatarMxc, getMemberDisplayName, getRoomAvatarUrl } from '../../utils/room';
import colorMXID from '../../../util/colorMXID';
import { ResultItem } from './useMessageSearch';
import { SequenceCard } from '../../components/sequence-card';
import { UserAvatar } from '../../components/user-avatar';
import { useMentionClickHandler } from '../../hooks/useMentionClickHandler';
import { useSpoilerClickHandler } from '../../hooks/useSpoilerClickHandler';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';

type SearchResultGroupProps = {
  room: Room;
  highlights: string[];
  items: ResultItem[];
  mediaAutoLoad?: boolean;
  urlPreview?: boolean;
  onOpen: (roomId: string, eventId: string) => void;
};
export function SearchResultGroup({
  room,
  highlights,
  items,
  mediaAutoLoad,
  urlPreview,
  onOpen,
}: SearchResultGroupProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const highlightRegex = useMemo(() => makeHighlightRegex(highlights), [highlights]);

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
        highlightRegex,
        useAuthentication,
        handleSpoilerClick: spoilerClickHandler,
        handleMentionClick: mentionClickHandler,
      }),
    [mx, room, linkifyOpts, highlightRegex, mentionClickHandler, spoilerClickHandler, useAuthentication]
  );

  const renderMatrixEvent = useMatrixEventRenderer<[IEventWithRoomId, string, GetContentCallback]>(
    {
      [MessageEvent.RoomMessage]: (event, displayName, getContent) => {
        if (event.unsigned?.redacted_because) {
          return <RedactedContent reason={event.unsigned?.redacted_because.content.reason} />;
        }

        return (
          <RenderMessageContent
            displayName={displayName}
            msgType={event.content.msgtype ?? ''}
            ts={event.origin_server_ts}
            getContent={getContent}
            mediaAutoLoad={mediaAutoLoad}
            urlPreview={urlPreview}
            htmlReactParserOptions={htmlReactParserOptions}
            linkifyOpts={linkifyOpts}
            highlightRegex={highlightRegex}
            outlineAttachment
          />
        );
      },
      [MessageEvent.Reaction]: (event, displayName, getContent) => {
        if (event.unsigned?.redacted_because) {
          return <RedactedContent reason={event.unsigned?.redacted_because.content.reason} />;
        }
        return (
          <MSticker
            content={getContent()}
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
      },
      [StateEvent.RoomTombstone]: (event) => {
        const { content } = event;
        return (
          <Box grow="Yes" direction="Column">
            <Text size="T400" priority="300">
              Room Tombstone. {content.body}
            </Text>
          </Box>
        );
      },
    },
    undefined,
    (event) => {
      if (event.unsigned?.redacted_because) {
        return <RedactedContent reason={event.unsigned?.redacted_because.content.reason} />;
      }
      return (
        <Box grow="Yes" direction="Column">
          <Text size="T400" priority="300">
            <code className={customHtmlCss.Code}>{event.type}</code>
            {' event'}
          </Text>
        </Box>
      );
    }
  );

  const handleOpenClick: MouseEventHandler = (evt) => {
    const eventId = evt.currentTarget.getAttribute('data-event-id');
    if (!eventId) return;
    onOpen(room.roomId, eventId);
  };

  return (
    <Box direction="Column" gap="200">
      <Header size="300">
        <Box gap="200" grow="Yes">
          <Avatar size="200" radii="300">
            <RoomAvatar
              roomId={room.roomId}
              src={getRoomAvatarUrl(mx, room, 96, useAuthentication)}
              alt={room.name}
              renderFallback={() => (
                <RoomIcon size="50" joinRule={room.getJoinRule() ?? JoinRule.Restricted} filled />
              )}
            />
          </Avatar>
          <Text size="H4" truncate>
            {room.name}
          </Text>
        </Box>
      </Header>
      <Box direction="Column" gap="100">
        {items.map((item) => {
          const { event } = item;

          const displayName =
            getMemberDisplayName(room, event.sender) ??
            getMxIdLocalPart(event.sender) ??
            event.sender;
          const senderAvatarMxc = getMemberAvatarMxc(room, event.sender);

          const relation = event.content['m.relates_to'];
          const mainEventId =
            relation?.rel_type === RelationType.Replace ? relation.event_id : event.event_id;

          const getContent = (() =>
            event.content['m.new_content'] ?? event.content) as GetContentCallback;

          const replyEventId = relation?.['m.in_reply_to']?.event_id;
          const threadRootId =
            relation?.rel_type === RelationType.Thread ? relation.event_id : undefined;

          return (
            <SequenceCard
              key={event.event_id}
              style={{ padding: config.space.S400 }}
              variant="SurfaceVariant"
              direction="Column"
            >
              <ModernLayout
                before={
                  <AvatarBase>
                    <Avatar size="300">
                      <UserAvatar
                        userId={event.sender}
                        src={
                          senderAvatarMxc
                            ? mxcUrlToHttp(mx, senderAvatarMxc, useAuthentication, 48, 48, 'crop') ?? undefined
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
                    <Username style={{ color: colorMXID(event.sender) }}>
                      <Text as="span" truncate>
                        <b>{displayName}</b>
                      </Text>
                    </Username>
                    <Time ts={event.origin_server_ts} />
                  </Box>
                  <Box shrink="No" gap="200" alignItems="Center">
                    <Chip
                      data-event-id={mainEventId}
                      onClick={handleOpenClick}
                      variant="Secondary"
                      radii="400"
                    >
                      <Text size="T200">Open</Text>
                    </Chip>
                  </Box>
                </Box>
                {replyEventId && (
                  <Reply
                    mx={mx}
                    room={room}
                    replyEventId={replyEventId}
                    threadRootId={threadRootId}
                    onClick={handleOpenClick}
                  />
                )}
                {renderMatrixEvent(event.type, false, event, displayName, getContent)}
              </ModernLayout>
            </SequenceCard>
          );
        })}
      </Box>
    </Box>
  );
}
