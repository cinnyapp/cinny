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
  useMemo,
  ChangeEventHandler,
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
  Badge,
  Header,
  Avatar,
  toRem,
  Input,
  Line,
  Button,
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
import { JoinRoomMemberObject } from '../../../../client/storage/collections';
import { useAsyncSearch, UseAsyncSearchOptions } from '../../../hooks/useAsyncSearch';
import { highlightText, makeHighlightRegex } from '../../../plugins/react-custom-html-parser';
import { UserAvatar } from '../../../components/user-avatar';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { getMxIdLocalPart } from '../../../utils/matrix';
import { getMemberSort } from '../../../hooks/useMemberSort';

const useTypeFilter = () => {
  const typeFilter: { label: string; types: string[] }[] = useMemo(
    () => [
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
    ],
    []
  );

  return typeFilter;
};

type FilterOption = { id: string; label: string; selected: boolean; onToggle: () => void };

type FilterChipProps = {
  title: string;
  icon: typeof Icons[keyof typeof Icons];
  label: string;
  options: FilterOption[];
  onClear: () => void;
};

function FilterChip({ title, icon, label, options, onClear }: FilterChipProps) {
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
              <Menu style={{ width: toRem(200) }}>
                <Header
                  size="300"
                  style={{
                    paddingLeft: config.space.S200,
                    paddingRight: config.space.S100,
                    borderBottomWidth: config.borderWidth.B300,
                  }}
                >
                  <Box grow="Yes">
                    <Text size="L400">{title}</Text>
                  </Box>
                  {count > 0 && (
                    <Chip onClick={onClear} variant="Critical" radii="Pill" outlined>
                      <Text as="span" size="L400">
                        Clear
                      </Text>
                    </Chip>
                  )}
                </Header>
                <Box style={{ padding: config.space.S100 }} direction="Column" gap="100">
                  {options.map((option) => (
                    <MenuItem
                      key={option.id}
                      variant={option.selected ? 'Primary' : 'Surface'}
                      size="300"
                      radii="300"
                      aria-pressed={option.selected}
                      onClick={option.onToggle}
                      after={option.selected && <Icon size="100" src={Icons.Check} />}
                    >
                      <Text style={{ flexGrow: 1 }} size="T300" truncate>
                        {option.label}
                      </Text>
                    </MenuItem>
                  ))}
                </Box>
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
            after={
              count > 0 && (
                <Badge variant="Primary" fill="Solid" radii="Pill">
                  <Text size="L400">{count}</Text>
                </Badge>
              )
            }
          >
            <Text as="span" size="L400">
              {label}
            </Text>
          </Chip>
        </PopOut>
      )}
    </UseStateProvider>
  );
}

const FALLBACK_MEMBERS: JoinRoomMemberObject[] = [];
const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 1000,
  matchOptions: {
    contain: true,
  },
};
function SenderFilterChip({
  senders,
  onSendersChange,
}: {
  senders: string[];
  onSendersChange: (senders: string[]) => void;
}) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const membersAPI = useRoomMembersAPI();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [anchor, setAnchor] = useState<RectCords>();

  const members = useMemo(
    () =>
      Array.from(membersAPI.memberEventsResult.value ?? FALLBACK_MEMBERS).sort(
        getMemberSort(membersAPI.getName).NewestFirst
      ),
    [membersAPI]
  );
  const [result, search, resetSearch] = useAsyncSearch(
    members,
    useCallback(
      (memberEvent) => [
        membersAPI.getName(memberEvent.userId),
        getMxIdLocalPart(memberEvent.userId) ?? memberEvent.userId,
        memberEvent.userId,
      ],
      [membersAPI]
    ),
    SEARCH_OPTIONS
  );
  const queryHighlighRegex = result?.query ? makeHighlightRegex([result.query]) : undefined;

  const memberItems = result?.items ?? members;

  const virtualizer = useVirtualizer({
    count: memberItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 5,
  });
  const vItems = virtualizer.getVirtualItems();

  const handleToggle = (userId: string) => {
    const next = new Set(senders);
    if (senders.includes(userId)) next.delete(userId);
    else next.add(userId);
    onSendersChange(Array.from(next));
  };

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const input = evt.currentTarget;
    const term = input.value.trim();
    if (term) {
      search(term);
    } else {
      resetSearch();
    }
  };

  return (
    <>
      <Chip
        variant={senders.length > 0 ? 'Primary' : 'SurfaceVariant'}
        radii="400"
        before={<Icon size="50" src={Icons.User} />}
        onClick={
          ((evt) =>
            setAnchor(
              evt.currentTarget.getBoundingClientRect()
            )) as MouseEventHandler<HTMLButtonElement>
        }
        after={
          senders.length > 0 && (
            <Badge variant="Primary" fill="Solid" radii="Pill">
              <Text size="L400">{senders.length}</Text>
            </Badge>
          )
        }
      >
        <Text as="span" size="L400">
          By Sender
        </Text>
      </Chip>
      {anchor && (
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
              <Menu>
                <Box style={{ padding: config.space.S200 }} direction="Column" gap="100">
                  <Text size="L400">Members</Text>
                  <Box grow="Yes" direction="Column" gap="100">
                    <Input
                      before={<Icon size="50" src={Icons.Search} />}
                      size="400"
                      variant="Background"
                      radii="300"
                      outlined
                      placeholder="username"
                      onChange={handleInputChange}
                      style={{ paddingRight: config.space.S200 }}
                      after={
                        result && (
                          <IconButton
                            size="300"
                            radii="300"
                            variant="Background"
                            onClick={() => resetSearch()}
                          >
                            <Icon src={Icons.Cross} size="100" />
                          </IconButton>
                        )
                      }
                    />
                  </Box>
                </Box>
                <Line size="300" />
                <Scroll
                  ref={scrollRef}
                  size="300"
                  hideTrack
                  style={{ height: toRem(300), width: toRem(250) }}
                >
                  <div
                    style={{
                      padding: `${config.space.S200} 0 ${config.space.S200} ${config.space.S200}`,
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        height: virtualizer.getTotalSize(),
                      }}
                    >
                      {vItems.length === 0 ? (
                        <Text style={{ padding: config.space.S400 }} size="L400" align="Center">
                          No Members
                        </Text>
                      ) : (
                        vItems.map((vItem) => {
                          const member = memberItems[vItem.index];
                          const selected = senders.includes(member.userId);
                          const avatarMxc = membersAPI.getAvatar(member.userId);

                          const username = getMxIdLocalPart(member.userId) ?? member.userId;

                          return (
                            <VirtualTile
                              virtualItem={vItem}
                              style={{ paddingBottom: config.space.S100 }}
                              ref={virtualizer.measureElement}
                              key={vItem.index}
                            >
                              <MenuItem
                                key={member.userId}
                                variant={selected ? 'Primary' : 'Surface'}
                                size="300"
                                radii="300"
                                aria-pressed={selected}
                                onClick={() => handleToggle(member.userId)}
                                after={selected && <Icon size="100" src={Icons.Check} />}
                              >
                                <Box grow="Yes" alignItems="Center" gap="200">
                                  <Avatar size="200" radii="Pill">
                                    <UserAvatar
                                      userId={member.userId}
                                      src={
                                        avatarMxc
                                          ? mxcToHttp(
                                              ct.session.baseUrl,
                                              avatarMxc,
                                              useAuthentication
                                            ).thumbnail({
                                              width: 96,
                                              height: 96,
                                              method: 'crop',
                                            })
                                          : undefined
                                      }
                                      alt={membersAPI.getName(member.userId)}
                                      renderFallback={() => (
                                        <Icon size="50" src={Icons.User} filled />
                                      )}
                                    />
                                  </Avatar>
                                  <Text size="T300" truncate>
                                    {queryHighlighRegex
                                      ? highlightText(queryHighlighRegex, [
                                          membersAPI.getName(member.userId),
                                        ])
                                      : membersAPI.getName(member.userId)}
                                  </Text>
                                  <Text size="T200" truncate>
                                    @
                                    {queryHighlighRegex
                                      ? highlightText(queryHighlighRegex, [username])
                                      : username}
                                  </Text>
                                </Box>
                              </MenuItem>
                            </VirtualTile>
                          );
                        })
                      )}
                    </div>
                  </div>
                </Scroll>
                {senders.length > 0 && (
                  <>
                    <Line size="300" />
                    <Box direction="Column" style={{ margin: config.space.S100 }}>
                      <Button
                        size="300"
                        variant="Critical"
                        fill="Soft"
                        radii="300"
                        onClick={() => onSendersChange([])}
                      >
                        <Text as="span" size="B300">
                          Clear ({senders.length})
                        </Text>
                      </Button>
                    </Box>
                  </>
                )}
              </Menu>
            </FocusTrap>
          }
        />
      )}
    </>
  );
}

type ActivityFilterProps = {
  types?: string[];
  onTypesChange: (types?: string[]) => void;
  senders: string[];
  onSendersChange: (senders: string[]) => void;
};

function ActivityFilter({ types, onTypesChange, senders, onSendersChange }: ActivityFilterProps) {
  const typeFilter = useTypeFilter();

  const typeOptions: FilterOption[] = typeFilter.map((group) => {
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

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Filter</Text>
      <Box gap="200">
        <FilterChip
          title="Activity Types"
          icon={Icons.Filter}
          label="By Type"
          options={typeOptions}
          onClear={() => onTypesChange(undefined)}
        />
        <SenderFilterChip senders={senders} onSendersChange={onSendersChange} />
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
  const [senders, setSenders] = useState<string[]>([]);
  const { events, hasMore, isLoadingMore, loadMore, isLoading } = useActivityMessages(
    roomId,
    types,
    senders.length === 0 ? undefined : senders
  );

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
                senders={senders}
                onSendersChange={setSenders}
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
