/* eslint-disable react/destructuring-assignment */
import React, {
  forwardRef,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  Avatar,
  Box,
  Chip,
  color,
  config,
  Header,
  Icon,
  IconButton,
  Icons,
  Menu,
  Scroll,
  Spinner,
  Text,
  toRem,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { putStateEvent } from 'neurone/lib/api/matrix/client/v3/rooms';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { useRoomPinnedEvents } from '../../../hooks/useRoomPinnedEvents';
import * as css from './RoomPinMenu.css';
import { SequenceCard } from '../../../components/sequence-card';
import { useRoomEvent } from '../../../hooks/useRoomEvent';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import {
  AvatarBase,
  DefaultPlaceholder,
  ModernLayout,
  RedactedContent,
  Time,
  Username,
  UsernameBold,
} from '../../../components/message';
import { UserAvatar } from '../../../components/user-avatar';
import { getLatestEditEvent } from '../../../utils/room';
import { RoomPinnedEventsContent, StateEventType } from '../../../../types/matrix/room';
import { useSettings } from '../../../state/hooks/settings';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { VirtualTile } from '../../../components/virtualizer';
import { usePowerLevelsContext } from '../../../hooks/usePowerLevels';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { usePowerLevelTagsContext } from '../../../hooks/usePowerLevelTags';
import { useTheme } from '../../../hooks/useTheme';
import { PowerIcon } from '../../../components/power';
import colorMXID from '../../../../util/colorMXID';
import { useIsDirectRoom, useRoom } from '../../../hooks/useRoom';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../../hooks/useRoomPermissions';
import {
  getPowerTagIconSrc,
  useAccessiblePowerTagColors,
  useGetMemberPowerTag,
} from '../../../hooks/useMemberPowerTag';
import { useRoomCreatorsTag } from '../../../hooks/useRoomCreatorsTag';
import { useClient } from '../../../hooks/useClient';
import { useRoomMembersAPI } from '../../../hooks/useRoomMembers';
import { useMessageParserOptions } from '../../../hooks/useMessageParserOptions';
import { useRoomHeroes } from '../../../hooks/storage/useRoomHeros';
import { useGetRoomName } from '../../../hooks/storage/useGetRoomName';
import {
  useObservableValue,
  useObservableValueOptionally,
} from '../../../hooks/useObservableValue';
import { MessageContent } from '../../../components/MessageContent';
import { RenderMessageContent } from '../../../components/RenderMessageContent';
import { rContent } from '../../../../client/reader';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { redacted } from '../../../../client/room/relations';

type PinnedMessageProps = {
  pinnedEvents: string[];
  roomId: string;
  eventId: string;
  onOpen: (roomId: string, eventId: string) => void;
  canPinEvent: boolean;
  children: (event: MessageEventWithoutRoomId, renderOptions: () => ReactNode) => ReactNode;
};
function PinnedMessage({
  pinnedEvents,
  roomId,
  eventId,
  onOpen,
  canPinEvent,
  children,
}: PinnedMessageProps) {
  const pinnedEvent = useRoomEvent(roomId, eventId);
  const ct = useClient();

  const [unpinState, unpin] = useAsyncCallback(
    useCallback(async () => {
      const newContent: RoomPinnedEventsContent = {
        pinned: pinnedEvents.filter((id) => id !== eventId),
      };

      const resp = await ct.requestAuthJSON(
        putStateEvent({
          pathParams: { roomId, eventType: StateEventType.RoomPinnedEvents, stateKey: '' },
          body: newContent,
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) {
        throw new Error(err.data.error ?? err.data.errcode);
      }
    }, [roomId, eventId, ct, pinnedEvents])
  );

  const handleOpenClick: MouseEventHandler = (evt) => {
    evt.stopPropagation();
    const evtId = evt.currentTarget.getAttribute('data-event-id');
    if (!evtId) return;
    onOpen(roomId, evtId);
  };

  const handleUnpinClick: MouseEventHandler = (evt) => {
    evt.stopPropagation();
    unpin();
  };

  const renderOptions = () => (
    <Box shrink="No" gap="200" alignItems="Center">
      <Chip data-event-id={eventId} onClick={handleOpenClick} variant="Secondary" radii="Pill">
        <Text size="T200">Open</Text>
      </Chip>
      {canPinEvent && (
        <IconButton
          data-event-id={eventId}
          variant="Secondary"
          size="300"
          radii="Pill"
          onClick={unpinState.status === AsyncStatus.Loading ? undefined : handleUnpinClick}
          aria-disabled={unpinState.status === AsyncStatus.Loading}
        >
          {unpinState.status === AsyncStatus.Loading ? (
            <Spinner size="100" />
          ) : (
            <Icon src={Icons.Cross} size="100" />
          )}
        </IconButton>
      )}
    </Box>
  );

  if (pinnedEvent === undefined) return <DefaultPlaceholder variant="Secondary" />;
  if (pinnedEvent === null)
    return (
      <Box gap="300" justifyContent="SpaceBetween" alignItems="Center">
        <Box>
          <Text style={{ color: color.Critical.Main }}>Failed to load message!</Text>
        </Box>
        {renderOptions()}
      </Box>
    );

  return children(pinnedEvent, renderOptions);
}

type RoomPinMenuProps = {
  requestClose: () => void;
};
export const RoomPinMenu = forwardRef<HTMLDivElement, RoomPinMenuProps>(({ requestClose }, ref) => {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const roomId = useRoom();
  const { userId } = ct.session;
  const direct = useIsDirectRoom();

  const roomToTimeline = useObservableValue(ct.roomToTimeline);
  const timeline = roomToTimeline.get(roomId);
  const redactedSet = useObservableValueOptionally(timeline?.relations.redacted);
  const edits = useObservableValueOptionally(timeline?.relations.edits.eventToRelations);

  const [getRoomHeroes, roomToHeroMembersResult] = useRoomHeroes(roomId);
  const getRoomName = useGetRoomName(getRoomHeroes, roomToHeroMembersResult.value);
  const membersAPI = useRoomMembersAPI();
  const { linkifyOpts, htmlReactParserOptions } = useMessageParserOptions(
    roomId,
    getRoomName,
    membersAPI.getName
  );

  const creators = useRoomCreators(roomId);
  const powerLevels = usePowerLevelsContext();

  const permissions = useRoomPermissions(creators, powerLevels);
  const canPinEvent = permissions.stateEvent(StateEventType.RoomPinnedEvents, userId);

  const getMemberPowerTag = useGetMemberPowerTag(creators, powerLevels);
  const creatorsTag = useRoomCreatorsTag();
  const powerLevelTags = usePowerLevelTagsContext();

  const theme = useTheme();
  const accessibleTagColors = useAccessiblePowerTagColors(theme.kind, creatorsTag, powerLevelTags);

  const pinnedEvents = useRoomPinnedEvents(roomId);
  const sortedPinnedEvent = useMemo(() => Array.from(pinnedEvents).reverse(), [pinnedEvents]);

  const { mediaAutoLoad, urlPreview, legacyUsernameColor, hour24Clock, dateFormatString } =
    useSettings();

  const { navigateRoom } = useRoomNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: sortedPinnedEvent.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 75,
    overscan: 4,
  });

  const handleOpen = (rId: string, eventId: string) => {
    navigateRoom(rId, eventId);
    requestClose();
  };

  return (
    <Menu ref={ref} className={css.PinMenu}>
      <Box grow="Yes" direction="Column">
        <Header className={css.PinMenuHeader} size="500">
          <Box grow="Yes">
            <Text size="H5">Pinned Messages</Text>
          </Box>
          <Box shrink="No">
            <IconButton size="300" onClick={requestClose} radii="300">
              <Icon src={Icons.Cross} size="400" />
            </IconButton>
          </Box>
        </Header>
        <Box grow="Yes">
          <Scroll ref={scrollRef} size="300" hideTrack visibility="Hover">
            <Box className={css.PinMenuContent} direction="Column" gap="100">
              {sortedPinnedEvent.length > 0 ? (
                <div
                  style={{
                    position: 'relative',
                    height: virtualizer.getTotalSize(),
                  }}
                >
                  {virtualizer.getVirtualItems().map((vItem) => {
                    const eventId = sortedPinnedEvent[vItem.index];
                    if (!eventId) return null;

                    return (
                      <VirtualTile
                        virtualItem={vItem}
                        style={{ paddingBottom: config.space.S200 }}
                        ref={virtualizer.measureElement}
                        key={vItem.index}
                      >
                        <SequenceCard
                          style={{ padding: `${config.space.S300} ${config.space.S400}` }}
                          variant="SurfaceVariant"
                          direction="Column"
                        >
                          <PinnedMessage
                            pinnedEvents={pinnedEvents}
                            roomId={roomId}
                            eventId={eventId}
                            onOpen={handleOpen}
                            canPinEvent={canPinEvent}
                          >
                            {(event, renderOptions) => {
                              const displayName = membersAPI.getName(event.sender);

                              const senderAvatarMxc = membersAPI.getAvatar(event.sender);

                              const memberPowerTag = getMemberPowerTag(event.sender);
                              const tagColor = memberPowerTag?.color
                                ? accessibleTagColors?.get(memberPowerTag.color)
                                : undefined;
                              const tagIconSrc = memberPowerTag?.icon
                                ? getPowerTagIconSrc(ct, useAuthentication, memberPowerTag.icon)
                                : undefined;

                              const usernameColor =
                                legacyUsernameColor || direct ? colorMXID(event.sender) : tagColor;

                              const editEvents = edits?.get(event.event_id);
                              const editedEvent = getLatestEditEvent(
                                event,
                                editEvents,
                                redactedSet
                              );

                              return (
                                <ModernLayout
                                  before={
                                    <AvatarBase>
                                      <Avatar size="300">
                                        <UserAvatar
                                          userId={event.sender}
                                          src={
                                            senderAvatarMxc
                                              ? mxcToHttp(
                                                  ct.session.baseUrl,
                                                  senderAvatarMxc,
                                                  useAuthentication
                                                ).thumbnail({
                                                  width: 96,
                                                  height: 96,
                                                  method: 'crop',
                                                })
                                              : undefined
                                          }
                                          alt={displayName}
                                          renderFallback={() => (
                                            <Icon size="200" src={Icons.User} filled />
                                          )}
                                        />
                                      </Avatar>
                                    </AvatarBase>
                                  }
                                >
                                  <Box
                                    gap="300"
                                    justifyContent="SpaceBetween"
                                    alignItems="Center"
                                    grow="Yes"
                                  >
                                    <Box gap="200" alignItems="Baseline">
                                      <Box alignItems="Center" gap="200">
                                        <Username style={{ color: usernameColor }}>
                                          <Text as="span" truncate>
                                            <UsernameBold>{displayName}</UsernameBold>
                                          </Text>
                                        </Username>
                                        {tagIconSrc && (
                                          <PowerIcon size="100" iconSrc={tagIconSrc} />
                                        )}
                                      </Box>
                                      <Time
                                        ts={event.origin_server_ts}
                                        hour24Clock={hour24Clock}
                                        dateFormatString={dateFormatString}
                                      />
                                    </Box>
                                    <Box shrink="No" gap="200" alignItems="Center">
                                      {renderOptions()}
                                    </Box>
                                  </Box>
                                  {redactedSet?.has(event.event_id) || redacted(event) ? (
                                    <RedactedContent />
                                  ) : (
                                    <MessageContent
                                      event={event}
                                      editedEvent={editedEvent}
                                      roomId={roomId}
                                      decryptionManager={ct.decryption}
                                    >
                                      {(contentEvent) => (
                                        <RenderMessageContent
                                          displayName={membersAPI.getName(event.sender)}
                                          eventType={contentEvent.type}
                                          ts={event.origin_server_ts}
                                          edited={!!editedEvent}
                                          content={
                                            rContent.newContent(contentEvent.content) ??
                                            contentEvent.content
                                          }
                                          mediaAutoLoad={mediaAutoLoad}
                                          urlPreview={urlPreview}
                                          htmlReactParserOptions={htmlReactParserOptions}
                                          linkifyOpts={linkifyOpts}
                                        />
                                      )}
                                    </MessageContent>
                                  )}
                                </ModernLayout>
                              );
                            }}
                          </PinnedMessage>
                        </SequenceCard>
                      </VirtualTile>
                    );
                  })}
                </div>
              ) : (
                <Box
                  className={ContainerColor({ variant: 'SurfaceVariant' })}
                  style={{
                    marginBottom: config.space.S200,
                    padding: `${config.space.S700} ${config.space.S400} ${toRem(60)}`,
                    borderRadius: config.radii.R300,
                  }}
                  grow="Yes"
                  direction="Column"
                  gap="400"
                  justifyContent="Center"
                  alignItems="Center"
                >
                  <Icon src={Icons.Pin} size="600" />
                  <Box
                    style={{ maxWidth: toRem(300) }}
                    direction="Column"
                    gap="200"
                    alignItems="Center"
                  >
                    <Text size="H4" align="Center">
                      No Pinned Messages
                    </Text>
                    <Text size="T400" align="Center">
                      Users with sufficient power level can pin a messages from its context menu.
                    </Text>
                  </Box>
                </Box>
              )}
            </Box>
          </Scroll>
        </Box>
      </Box>
    </Menu>
  );
});
