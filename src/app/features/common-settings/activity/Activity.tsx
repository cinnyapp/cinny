/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, {
  ReactNode,
  useRef,
  useEffect,
  useCallback,
  MouseEventHandler,
  useState,
} from 'react';
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
import { useRoomMembersAPI } from '../../../hooks/useRoomMembers';

const TYPE_FILTERS: { label: string; types: string[] }[] = [
  { label: 'Members', types: ['m.room.member'] },
  {
    label: 'Room details',
    types: ['m.room.name', 'm.room.topic', 'm.room.avatar', 'm.room.canonical_alias'],
  },
  { label: 'Permissions', types: ['m.room.power_levels'] },
  {
    label: 'Access & privacy',
    types: [
      'm.room.join_rules',
      'm.room.history_visibility',
      'm.room.guest_access',
      'm.room.encryption',
      'm.room.server_acl',
    ],
  },
  { label: 'Pinned messages', types: ['m.room.pinned_events'] },
  { label: 'Removed messages', types: ['m.room.redaction'] },
  { label: 'Reactions', types: ['m.reaction'] },
  { label: 'Spaces', types: ['m.space.child', 'm.space.parent'] },
  { label: 'Created & upgraded', types: ['m.room.create', 'm.room.tombstone'] },
];

type FilterOption = { id: string; label: string; selected: boolean; onToggle: () => void };

type FilterChipProps = {
  icon: typeof Icons[keyof typeof Icons];
  label: string;
  options: FilterOption[];
  onClear: () => void;
};

function FilterChip({ icon, label, options, onClear }: FilterChipProps) {
  const count = options.filter((o) => o.selected).length;

  return (
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
                <Box direction="Column" style={{ maxHeight: '320px', overflowY: 'auto' }} gap="100">
                  {options.length === 0 && (
                    <Text size="T300" style={{ padding: config.space.S200 }}>
                      Nothing to filter yet
                    </Text>
                  )}
                  {options.map((option) => (
                    <MenuItem
                      key={option.id}
                      variant={option.selected ? 'Success' : 'Surface'}
                      size="300"
                      radii="300"
                      aria-pressed={option.selected}
                      onClick={option.onToggle}
                      after={option.selected && <Icon size="100" src={Icons.Check} />}
                    >
                      <Text size="T300" truncate>
                        {option.label}
                      </Text>
                    </MenuItem>
                  ))}
                </Box>
                {count > 0 && (
                  <MenuItem variant="Critical" size="300" radii="300" onClick={onClear}>
                    <Text size="T300">Clear</Text>
                  </MenuItem>
                )}
              </Menu>
            </FocusTrap>
          }
        >
          <Chip
            variant={count > 0 ? 'Primary' : 'SurfaceVariant'}
            radii="400"
            before={<Icon size="50" src={icon} />}
            onClick={
              ((evt) =>
                setAnchor(
                  evt.currentTarget.getBoundingClientRect()
                )) as MouseEventHandler<HTMLButtonElement>
            }
          >
            <Text as="span" size="L400">
              {count > 0 ? `${label} (${count})` : label}
            </Text>
          </Chip>
        </PopOut>
      )}
    </UseStateProvider>
  );
}

type ActivityFilterProps = {
  types?: string[];
  onTypesChange: (types?: string[]) => void;
  senders?: string[];
  onSendersChange: (senders?: string[]) => void;
  senderOptions: string[];
};

function ActivityFilter({
  types,
  onTypesChange,
  senders,
  onSendersChange,
  senderOptions,
}: ActivityFilterProps) {
  const membersAPI = useRoomMembersAPI();

  const typeOptions: FilterOption[] = TYPE_FILTERS.map((group) => {
    const selected = group.types.every((t) => types?.includes(t));
    return {
      id: group.label,
      label: group.label,
      selected,
      onToggle: () => {
        const next = new Set(types);
        group.types.forEach((t) => (selected ? next.delete(t) : next.add(t)));
        onTypesChange(next.size > 0 ? Array.from(next) : undefined);
      },
    };
  });

  const senderFilterOptions: FilterOption[] = senderOptions
    .map((userId) => {
      const selected = !!senders?.includes(userId);
      return {
        id: userId,
        label: membersAPI.getName(userId),
        selected,
        onToggle: () => {
          const next = new Set(senders);
          if (selected) next.delete(userId);
          else next.add(userId);
          onSendersChange(next.size > 0 ? Array.from(next) : undefined);
        },
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Filter</Text>
      <Box gap="200">
        <FilterChip
          icon={Icons.Filter}
          label="By Type"
          options={typeOptions}
          onClear={() => onTypesChange(undefined)}
        />
        <FilterChip
          icon={Icons.User}
          label="By Sender"
          options={senderFilterOptions}
          onClear={() => onSendersChange(undefined)}
        />
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

  const [types, setTypes] = useState<string[]>();
  const [sender, setSenders] = useState<string[]>();
  const { events, hasMore, isLoadingMore, loadMore, isLoading } = useActivityMessages(
    roomId,
    types,
    sender
  );

  // TODO: use room mebmers
  const [knownSenders, setKnownSenders] = useState<string[]>([]);

  useEffect(() => {
    setKnownSenders((prev) => {
      const next = new Set(prev);
      events.forEach((e) => next.add(e.sender));
      return next.size === prev.length ? prev : Array.from(next);
    });
  }, [events]);

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
              <ActivityFilter
                types={types}
                onTypesChange={setTypes}
                senders={sender}
                onSendersChange={setSenders}
                senderOptions={knownSenders}
              />

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
