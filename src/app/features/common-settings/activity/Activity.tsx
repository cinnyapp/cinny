/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { ReactNode, useRef, useEffect, useCallback, MouseEventHandler } from 'react';
import {
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  Scroll,
  config,
  Spinner,
  Chip,
  PopOut,
  RectCords,
  Menu,
  MenuItem,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ClientEvent } from 'neurone/lib/api/types';
import FocusTrap from 'focus-trap-react';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { useActivityMessages } from '../../../hooks/useActivityMessages';
import { useRoom } from '../../../hooks/useRoom';
import { VirtualTile } from '../../../components/virtualizer';
import { SequenceCard } from '../../../components/sequence-card';
import {
  RoomCreate,
  RoomNameChange,
  RoomTopicChange,
  RoomAvatarChange,
  CanonicalAliasChange,
  JoinRulesChange,
  HistoryVisibilityChange,
  GuestAccessChange,
  EncryptionEnabled,
  PinnedEventsChange,
  ServerAclChange,
  RoomTombstone,
  SpaceChildChange,
  SpaceParentChange,
  RoomMemberChange,
  PowerLevelsChange,
  RoomRedaction,
  ReactionEvent,
  UnknownEvent,
} from './Events';
import {
  useAccessiblePowerTagColors,
  useGetMemberPowerTag,
} from '../../../hooks/useMemberPowerTag';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { usePowerLevelsContext } from '../../../hooks/usePowerLevels';
import { useRoomCreatorsTag } from '../../../hooks/useRoomCreatorsTag';
import { usePowerLevelTagsContext } from '../../../hooks/usePowerLevelTags';
import { useTheme } from '../../../hooks/useTheme';
import { useSettings } from '../../../state/hooks/settings';
import { useClient } from '../../../hooks/useClient';
import colorMXID from '../../../../util/colorMXID';
import { inSameDay } from '../../../utils/time';
import { DividerTime } from '../../../components/message';
import { UseStateProvider } from '../../../components/UseStateProvider';
import { stopPropagation } from '../../../utils/keyboard';

function ActivityFilter() {
  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Filter</Text>
      <Box gap="200">
        <UseStateProvider initial={undefined}>
          {(anchor: RectCords | undefined, setAnchor) => (
            <PopOut
              anchor={anchor}
              position="Bottom"
              align="Start"
              offset={4}
              content={
                <FocusTrap
                  focusTrapOptions={{
                    initialFocus: false,
                    onDeactivate: () => setAnchor(undefined),
                    clickOutsideDeactivates: true,
                    isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                    isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                    escapeDeactivates: stopPropagation,
                  }}
                >
                  <Menu style={{ padding: config.space.S100 }}>
                    <MenuItem variant="Surface" size="300" radii="300">
                      <Text size="T300">Member Events</Text>
                    </MenuItem>
                    <MenuItem variant="Surface" size="300" radii="300">
                      <Text size="T300">Create Event</Text>
                    </MenuItem>
                    <MenuItem variant="Surface" size="300" radii="300">
                      <Text size="T300">Room Name</Text>
                    </MenuItem>
                  </Menu>
                </FocusTrap>
              }
            >
              <Chip
                variant="SurfaceVariant"
                radii="400"
                before={<Icon size="50" src={Icons.Filter} />}
                onClick={
                  ((evt) =>
                    setAnchor(
                      evt.currentTarget.getBoundingClientRect()
                    )) as MouseEventHandler<HTMLButtonElement>
                }
              >
                <Text as="span" size="L400">
                  By Type
                </Text>
              </Chip>
            </PopOut>
          )}
        </UseStateProvider>
        <Chip variant="SurfaceVariant" radii="400" before={<Icon size="50" src={Icons.User} />}>
          <Text as="span" size="L400">
            By User
          </Text>
        </Chip>
      </Box>
    </Box>
  );
}

type ActivityProps = {
  requestClose: () => void;
};
export function Activity({ requestClose }: ActivityProps) {
  const ct = useClient();
  const roomId = useRoom();

  const creators = useRoomCreators(roomId);
  const powerLevels = usePowerLevelsContext();
  const getMemberPowerTag = useGetMemberPowerTag(creators, powerLevels);
  const creatorsTag = useRoomCreatorsTag();
  const powerLevelTags = usePowerLevelTagsContext();

  const theme = useTheme();
  const accessibleTagColors = useAccessiblePowerTagColors(theme.kind, creatorsTag, powerLevelTags);

  const { legacyUsernameColor } = useSettings();

  const getUsernameColor = useCallback(
    (uId: string) => {
      const memberPowerTag = getMemberPowerTag(uId);
      const tagColor = memberPowerTag?.color
        ? accessibleTagColors?.get(memberPowerTag.color)
        : undefined;

      const dm = ct.directRooms.read.has(roomId);
      const usernameColor = legacyUsernameColor || dm ? colorMXID(uId) : tagColor;

      return usernameColor;
    },
    [ct, accessibleTagColors, legacyUsernameColor, roomId, getMemberPowerTag]
  );

  // const [types, setTypes] =
  const { events, hasMore, isLoadingMore, loadMore, isLoading } = useActivityMessages(roomId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 90,
    overscan: 4,
  });

  const vItems = virtualizer.getVirtualItems();

  const lastVItem = vItems[vItems.length - 1];
  const lastVItemIndex: number = lastVItem?.index ?? -1;
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    const totalEvents = events.length;
    if (totalEvents - lastVItemIndex < 10) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore, events, lastVItemIndex]);

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Activity
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll ref={scrollRef} hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="400">
              <ActivityFilter />

              <div
                style={{
                  position: 'relative',
                  height: virtualizer.getTotalSize(),
                }}
              >
                {vItems.map((vItem) => {
                  const prevEvent: ClientEvent | undefined = events[vItem.index - 1];
                  const event = events[vItem.index];

                  if (!event) return null;

                  let content: ReactNode = null;

                  if (event.type === 'm.room.create') {
                    content = <RoomCreate event={event} getUsernameColor={getUsernameColor} />;
                  } else if (event.type === 'm.room.name') {
                    content = <RoomNameChange event={event} getUsernameColor={getUsernameColor} />;
                  } else if (event.type === 'm.room.topic') {
                    content = <RoomTopicChange event={event} getUsernameColor={getUsernameColor} />;
                  } else if (event.type === 'm.room.avatar') {
                    content = (
                      <RoomAvatarChange event={event} getUsernameColor={getUsernameColor} />
                    );
                  } else if (event.type === 'm.room.canonical_alias') {
                    content = (
                      <CanonicalAliasChange event={event} getUsernameColor={getUsernameColor} />
                    );
                  } else if (event.type === 'm.room.join_rules') {
                    content = <JoinRulesChange event={event} getUsernameColor={getUsernameColor} />;
                  } else if (event.type === 'm.room.history_visibility') {
                    content = (
                      <HistoryVisibilityChange event={event} getUsernameColor={getUsernameColor} />
                    );
                  } else if (event.type === 'm.room.guest_access') {
                    content = (
                      <GuestAccessChange event={event} getUsernameColor={getUsernameColor} />
                    );
                  } else if (event.type === 'm.room.encryption') {
                    content = (
                      <EncryptionEnabled event={event} getUsernameColor={getUsernameColor} />
                    );
                  } else if (event.type === 'm.room.pinned_events') {
                    content = (
                      <PinnedEventsChange event={event} getUsernameColor={getUsernameColor} />
                    );
                  } else if (event.type === 'm.room.server_acl') {
                    content = <ServerAclChange event={event} getUsernameColor={getUsernameColor} />;
                  } else if (event.type === 'm.room.tombstone') {
                    content = <RoomTombstone event={event} getUsernameColor={getUsernameColor} />;
                  } else if (event.type === 'm.room.member') {
                    content = (
                      <RoomMemberChange event={event} getUsernameColor={getUsernameColor} />
                    );
                  } else if (event.type === 'm.room.power_levels') {
                    content = (
                      <PowerLevelsChange event={event} getUsernameColor={getUsernameColor} />
                    );
                  } else if (event.type === 'm.room.redaction') {
                    content = <RoomRedaction event={event} getUsernameColor={getUsernameColor} />;
                  } else if (event.type === 'm.space.child') {
                    content = (
                      <SpaceChildChange event={event} getUsernameColor={getUsernameColor} />
                    );
                  } else if (event.type === 'm.space.parent') {
                    content = (
                      <SpaceParentChange event={event} getUsernameColor={getUsernameColor} />
                    );
                  } else if (event.type === 'm.reaction') {
                    content = <ReactionEvent event={event} getUsernameColor={getUsernameColor} />;
                  } else {
                    content = <UnknownEvent event={event} getUsernameColor={getUsernameColor} />;
                  }

                  const divideTime = prevEvent
                    ? !inSameDay(prevEvent.origin_server_ts, event.origin_server_ts)
                    : true;
                  return (
                    <VirtualTile
                      key={vItem.key}
                      virtualItem={vItem}
                      ref={virtualizer.measureElement}
                      style={{
                        paddingBottom: config.space.S100,
                      }}
                    >
                      {divideTime && (
                        <Text style={{ padding: `${config.space.S400} 0` }} size="L400">
                          <DividerTime ts={event.origin_server_ts} />
                        </Text>
                      )}
                      <SequenceCard variant="Surface" gap="200">
                        {content}
                      </SequenceCard>
                    </VirtualTile>
                  );
                })}
              </div>
              {(isLoading || isLoadingMore) && (
                <Box
                  style={{ padding: `${config.space.S700} 0` }}
                  alignItems="Center"
                  justifyContent="Center"
                >
                  <Spinner variant="Secondary" />
                </Box>
              )}
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
