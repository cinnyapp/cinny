/* eslint-disable react/destructuring-assignment */
import React, { MouseEventHandler, ReactNode, useMemo } from 'react';
import { Avatar, Box, Chip, Header, Icon, Icons, Text, config } from 'folds';
import { makeHighlightRegex } from '../../plugins/react-custom-html-parser';
import {
  AvatarBase,
  ModernLayout,
  RedactedContent,
  Time,
  Username,
  UsernameBold,
} from '../../components/message';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { getLatestEditEvent } from '../../utils/room';
import { ResultItem } from './useMessageSearch';
import { SequenceCard } from '../../components/sequence-card';
import { UserAvatar } from '../../components/user-avatar';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import {
  PowerLevelsContextProvider,
  usePowerLevels,
  usePowerLevelsContext,
  usePowerLevelsState,
} from '../../hooks/usePowerLevels';
import {
  PowerLevelTagsContextProvider,
  usePowerLevelTags,
  usePowerLevelTagsContext,
  usePowerLevelTagsState,
} from '../../hooks/usePowerLevelTags';
import { useTheme } from '../../hooks/useTheme';
import { PowerIcon } from '../../components/power';
import colorMXID from '../../../util/colorMXID';
import {
  getPowerTagIconSrc,
  useAccessiblePowerTagColors,
  useGetMemberPowerTag,
} from '../../hooks/useMemberPowerTag';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomCreatorsTag } from '../../hooks/useRoomCreatorsTag';
import { mxcToHttp } from '../../../client/mxcToHttp';
import {
  RoomMembersAPIProvider,
  useRoomMembers,
  useRoomMembersAPI,
} from '../../hooks/useRoomMembers';
import { useClient } from '../../hooks/useClient';
import { GetRoomNameCallback } from '../../hooks/storage/useGetRoomName';
import { GetRoomAvatarCallback } from '../../hooks/storage/useGetRoomAvatar';
import { Timeline } from '../../../client/room';
import { useObservableValueOptionally } from '../../hooks/useObservableValue';
import { useMessageParserOptions } from '../../hooks/useMessageParserOptions';
import { MessageContent } from '../../components/MessageContent';
import { rContent } from '../../../client/reader';

type SearchGroupMessagesProps = {
  roomId: string;
  timeline?: Timeline;
  items: ResultItem[];
  highlights: string[];
  mediaAutoLoad?: boolean;
  urlPreview?: boolean;
  legacyUsernameColor?: boolean;
  hour24Clock: boolean;
  dateFormatString: string;
  getRoomName: GetRoomNameCallback;
  onOpen: (roomId: string, eventId: string) => void;
};
export function SearchGroupMessages({
  roomId,
  timeline,
  items,
  highlights,
  mediaAutoLoad,
  urlPreview,
  legacyUsernameColor,
  hour24Clock,
  dateFormatString,
  getRoomName,
  onOpen,
}: SearchGroupMessagesProps) {
  const ct = useClient();
  const membersAPI = useRoomMembersAPI();
  const useAuthentication = useMediaAuthentication();
  const highlightRegex = useMemo(() => makeHighlightRegex(highlights), [highlights]);

  const redacted = useObservableValueOptionally(timeline?.relations.redacted);
  const edits = useObservableValueOptionally(timeline?.relations.edits.eventToRelations);

  const creators = useRoomCreators(roomId);
  const powerLevels = usePowerLevelsContext();
  const getMemberPowerTag = useGetMemberPowerTag(creators, powerLevels);
  const creatorsTag = useRoomCreatorsTag();
  const powerLevelTags = usePowerLevelTagsContext();

  const theme = useTheme();
  const accessibleTagColors = useAccessiblePowerTagColors(theme.kind, creatorsTag, powerLevelTags);

  const { linkifyOpts, htmlReactParserOptions } = useMessageParserOptions(
    roomId,
    getRoomName,
    membersAPI.getName,
    highlightRegex
  );

  const handleOpenClick: MouseEventHandler = (evt) => {
    const eventId = evt.currentTarget.getAttribute('data-event-id');
    if (!eventId) return;
    onOpen(roomId, eventId);
  };

  return (
    <Box direction="Column" gap="100">
      {items.map((item) => {
        const { event } = item;

        const displayName = membersAPI.getName(event.sender);

        const senderAvatarMxc = membersAPI.getAvatar(event.sender);

        const memberPowerTag = getMemberPowerTag(event.sender);
        const tagColor = memberPowerTag?.color
          ? accessibleTagColors?.get(memberPowerTag.color)
          : undefined;
        const tagIconSrc = memberPowerTag?.icon
          ? getPowerTagIconSrc(ct, useAuthentication, memberPowerTag.icon)
          : undefined;

        const usernameColor = legacyUsernameColor ? colorMXID(event.sender) : tagColor;

        const editEvents = edits?.get(event.event_id);
        const editedEvent = editEvents && getLatestEditEvent(event.sender, editEvents, redacted);

        return (
          <SequenceCard
            key={event.event_id}
            style={{ padding: `${config.space.S300} ${config.space.S400}` }}
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
                          ? mxcToHttp(
                              ct.session.baseUrl,
                              senderAvatarMxc,
                              useAuthentication
                            ).thumbnail({ width: 96, height: 96, method: 'crop' })
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
                  <Box alignItems="Center" gap="200">
                    <Username style={{ color: usernameColor }}>
                      <Text as="span" truncate>
                        <UsernameBold>{displayName}</UsernameBold>
                      </Text>
                    </Username>
                    {tagIconSrc && <PowerIcon size="100" iconSrc={tagIconSrc} />}
                  </Box>
                  <Time
                    ts={event.origin_server_ts}
                    hour24Clock={hour24Clock}
                    dateFormatString={dateFormatString}
                  />
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
              {redacted?.has(event.event_id) ? (
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
                      content={rContent.newContent(contentEvent.content) ?? contentEvent.content}
                      mediaAutoLoad={mediaAutoLoad}
                      urlPreview={urlPreview}
                      htmlReactParserOptions={htmlReactParserOptions}
                      linkifyOpts={linkifyOpts}
                      highlightRegex={highlightRegex}
                    />
                  )}
                </MessageContent>
              )}
            </ModernLayout>
          </SequenceCard>
        );
      })}
    </Box>
  );
}

type SearchResultGroupProps = {
  roomId: string;
  items: ResultItem[];
  getRoomName: GetRoomNameCallback;
  getRoomAvatar: GetRoomAvatarCallback;
  children: ReactNode;
};
export function SearchResultGroup({
  roomId,
  items,
  getRoomName,
  getRoomAvatar,
  children,
}: SearchResultGroupProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  const users = useMemo(() => Array.from(new Set(items.map((i) => i.event.sender))), [items]);

  const avatarMxc = getRoomAvatar(roomId);

  const powerLevelStateResult = usePowerLevelsState(roomId);
  const powerLevels = usePowerLevels(powerLevelStateResult.value);

  const powerLevelTagsStateResult = usePowerLevelTagsState(roomId);
  const powerLevelTags = usePowerLevelTags(powerLevels, powerLevelTagsStateResult.value);

  const membersAPI = useRoomMembers(roomId, users);

  return (
    <Box direction="Column" gap="200">
      <Header size="300">
        <Box gap="200" grow="Yes">
          <Avatar size="200" radii="300">
            <RoomAvatar
              roomId={roomId}
              src={
                avatarMxc
                  ? mxcToHttp(ct.session.baseUrl, avatarMxc, useAuthentication).thumbnail({
                      width: 48,
                      height: 48,
                      method: 'crop',
                    })
                  : undefined
              }
              alt={getRoomName(roomId)}
              renderFallback={() => (
                <RoomIcon
                  size="50"
                  roomType={ct.roomToType.read.get(roomId)}
                  joinRule={ct.roomToJoinRule.read.get(roomId)}
                  filled
                />
              )}
            />
          </Avatar>
          <Text size="H4" truncate>
            {getRoomName(roomId) ?? 'Unknown'}
          </Text>
        </Box>
      </Header>
      <RoomMembersAPIProvider value={membersAPI}>
        <PowerLevelsContextProvider value={powerLevels}>
          <PowerLevelTagsContextProvider value={powerLevelTags}>
            {children}
          </PowerLevelTagsContextProvider>
        </PowerLevelsContextProvider>
      </RoomMembersAPIProvider>
    </Box>
  );
}
