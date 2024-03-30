/* eslint-disable react/destructuring-assignment */
import React, { MouseEventHandler, useMemo } from 'react';
import { IEventWithRoomId, Room } from 'matrix-js-sdk';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Avatar, AvatarFallback, AvatarImage, Box, Chip, Header, Text, config } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getReactCustomHtmlParser } from '../../plugins/react-custom-html-parser';
import { getMxIdLocalPart, isRoomId, isUserId } from '../../utils/matrix';
import {
  openJoinAlias,
  openProfileViewer,
  selectRoom,
  selectTab,
} from '../../../client/action/navigation';
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
import { RoomAvatar } from '../../components/room-avatar';
import { getMemberAvatarMxc, getMemberDisplayName, getRoomAvatarUrl } from '../../utils/room';
import { nameInitials } from '../../utils/common';
import colorMXID from '../../../util/colorMXID';
import { ResultItem } from './useMessageSearch';
import { SequenceCard } from '../../components/sequence-card';

type SearchResultGroupProps = {
  room: Room;
  items: ResultItem[];
  mediaAutoLoad?: boolean;
  urlPreview?: boolean;
  onOpen: (roomId: string, eventId: string) => void;
};
export function SearchResultGroup({
  room,
  items,
  mediaAutoLoad,
  urlPreview,
  onOpen,
}: SearchResultGroupProps) {
  const mx = useMatrixClient();

  const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
    () =>
      getReactCustomHtmlParser(mx, room, {
        handleSpoilerClick: (evt) => {
          const target = evt.currentTarget;
          if (target.getAttribute('aria-pressed') === 'true') {
            evt.stopPropagation();
            target.setAttribute('aria-pressed', 'false');
            target.style.cursor = 'initial';
          }
        },
        handleMentionClick: (evt) => {
          const target = evt.currentTarget;
          const mentionId = target.getAttribute('data-mention-id');
          if (typeof mentionId !== 'string') return;
          if (isUserId(mentionId)) {
            openProfileViewer(mentionId, room.roomId);
            return;
          }
          if (isRoomId(mentionId) && mx.getRoom(mentionId)) {
            if (mx.getRoom(mentionId)?.isSpaceRoom()) selectTab(mentionId);
            else selectRoom(mentionId);
            return;
          }
          openJoinAlias(mentionId);
        },
      }),
    [mx, room]
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

  const handleOpenClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
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
              variant="SurfaceVariant"
              src={getRoomAvatarUrl(mx, room, 96)}
              alt={room.name}
              renderInitials={() => (
                <Text as="span" size="H6">
                  {nameInitials(room.name)}
                </Text>
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
          const getContent = (() => event.content) as GetContentCallback;

          const replyEventId = event.content['m.relates_to']?.['m.in_reply_to']?.event_id;

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
                      {senderAvatarMxc ? (
                        <AvatarImage
                          src={mx.mxcUrlToHttp(senderAvatarMxc, 48, 48, 'crop') ?? senderAvatarMxc}
                        />
                      ) : (
                        <AvatarFallback
                          style={{
                            background: colorMXID(event.sender),
                            color: 'white',
                          }}
                        >
                          <Text size="H4">{nameInitials(displayName)}</Text>
                        </AvatarFallback>
                      )}
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
                      data-event-id={event.event_id}
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
                    as="button"
                    mx={mx}
                    room={room}
                    eventId={replyEventId}
                    data-event-id={replyEventId}
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
