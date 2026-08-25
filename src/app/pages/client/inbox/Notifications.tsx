/* eslint-disable react/destructuring-assignment */
import React, {
  MouseEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Avatar,
  Box,
  Chip,
  Header,
  Icon,
  IconButton,
  Icons,
  Scroll,
  Text,
  config,
  toRem,
} from 'folds';
import { useSearchParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtomValue } from 'jotai';
import {
  getNotifications,
  GetNotificationsOK,
} from 'neurone/lib/api/matrix/client/v3/notifications';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { NotificationChunk } from 'neurone/lib/api/types';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { InboxNotificationsPathSearchParams } from '../../paths';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { SequenceCard } from '../../../components/sequence-card';
import { RoomAvatar, RoomIcon } from '../../../components/room-avatar';
import { ScrollTopContainer } from '../../../components/scroll-top-container';
import { useInterval } from '../../../hooks/useInterval';
import {
  AvatarBase,
  ModernLayout,
  RedactedContent,
  Time,
  Username,
  UsernameBold,
} from '../../../components/message';
import { useSettings } from '../../../state/hooks/settings';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { VirtualTile } from '../../../components/virtualizer';
import { UserAvatar } from '../../../components/user-avatar';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import {
  PowerLevelsContextProvider,
  usePowerLevels,
  usePowerLevelsContext,
  usePowerLevelsState,
} from '../../../hooks/usePowerLevels';
import {
  PowerLevelTagsContextProvider,
  usePowerLevelTags,
  usePowerLevelTagsContext,
  usePowerLevelTagsState,
} from '../../../hooks/usePowerLevelTags';
import { useTheme } from '../../../hooks/useTheme';
import { PowerIcon } from '../../../components/power';
import colorMXID from '../../../../util/colorMXID';
import { mDirectAtom } from '../../../state/mDirectList';
import {
  getPowerTagIconSrc,
  useAccessiblePowerTagColors,
  useGetMemberPowerTag,
} from '../../../hooks/useMemberPowerTag';
import { useRoomCreatorsTag } from '../../../hooks/useRoomCreatorsTag';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { useClient } from '../../../hooks/useClient';
import {
  RoomMembersAPIProvider,
  useRoomMembers,
  useRoomMembersAPI,
} from '../../../hooks/useRoomMembers';
import { useMessageParserOptions } from '../../../hooks/useMessageParserOptions';
import { useRoomHeroes } from '../../../hooks/storage/useRoomHeros';
import { GetRoomNameCallback, useGetRoomName } from '../../../hooks/storage/useGetRoomName';
import { GetRoomAvatarCallback, useGetRoomAvatar } from '../../../hooks/storage/useGetRoomAvatar';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { useRoomUnread } from '../../../state/hooks/unread';
import { unreadRoomsAtom } from '../../../state/room/roomToUnread';
import { ErrorCode } from '../../../cs-errorcode';
import {
  useObservableValue,
  useObservableValueOptionally,
} from '../../../hooks/useObservableValue';
import { Timeline } from '../../../../client/room';
import { MessageContent } from '../../../components/MessageContent';
import { getLatestEditEvent } from '../../../utils/room';
import { RenderMessageContent } from '../../../components/RenderMessageContent';
import { rContent } from '../../../../client/reader';

type RoomNotificationsGroup = {
  roomId: string;
  notifications: NotificationChunk[];
};
type NotificationTimeline = {
  nextToken?: string;
  groups: RoomNotificationsGroup[];
};
type LoadTimeline = (from?: string) => Promise<void>;
type SilentReloadTimeline = () => Promise<void>;

const groupNotifications = (
  notifications: NotificationChunk[],
  allowRooms: Set<string>
): RoomNotificationsGroup[] => {
  const groups: RoomNotificationsGroup[] = [];
  notifications.forEach((notification) => {
    if (!allowRooms.has(notification.room_id)) return;

    const groupIndex = groups.length - 1;
    const lastAddedGroup: RoomNotificationsGroup | undefined = groups[groupIndex];
    if (lastAddedGroup && notification.room_id === lastAddedGroup.roomId) {
      lastAddedGroup.notifications.push(notification);
      return;
    }
    groups.push({
      roomId: notification.room_id,
      notifications: [notification],
    });
  });
  return groups;
};

const useNotificationTimeline = (
  paginationLimit: number,
  onlyHighlight?: boolean
): [NotificationTimeline, LoadTimeline, SilentReloadTimeline] => {
  const ct = useClient();
  const allRooms = useAtomValue(allRoomsAtom);
  const allJoinedRooms = useMemo(() => new Set(allRooms), [allRooms]);

  const [notificationTimeline, setNotificationTimeline] = useState<NotificationTimeline>({
    groups: [],
  });

  const fetchNotifications = useCallback(
    async (from?: string, limit?: number, only?: 'highlight') => {
      const resp = await ct.requestAuthJSON(
        getNotifications({ searchParams: { from, limit, only } })
      );
      const [err, result] = await parseMatrixResp<GetNotificationsOK>(resp);
      if (err) {
        if (err.data.errcode === ErrorCode.M_UNRECOGNIZED) {
          throw new Error('This feature is not supported by your homeserver!');
        }
        throw new Error(err.data.error ?? err.data.errcode);
      }

      return result;
    },
    [ct]
  );

  const loadTimeline: LoadTimeline = useCallback(
    async (from) => {
      if (!from) {
        setNotificationTimeline({ groups: [] });
      }
      const data = await fetchNotifications(
        from,
        paginationLimit,
        onlyHighlight ? 'highlight' : undefined
      );
      const groups = groupNotifications(data.notifications, allJoinedRooms);

      setNotificationTimeline((currentTimeline) => {
        if (currentTimeline.nextToken === from) {
          return {
            nextToken: data.next_token,
            groups: from ? currentTimeline.groups.concat(groups) : groups,
          };
        }
        return currentTimeline;
      });
    },
    [paginationLimit, onlyHighlight, fetchNotifications, allJoinedRooms]
  );

  /**
   * Reload timeline silently i.e without resetting to default.
   * Fetches the first page and diffs it against current state:
   * - if nothing new, keeps the existing state reference untouched
   * - if there are new notifications, only prepends them to the top
   *   (merging into the first existing group when it's the same room)
   *   instead of re-fetching/rebuilding the whole timeline.
   */
  const silentReloadTimeline: SilentReloadTimeline = useCallback(async () => {
    const data = await fetchNotifications(
      undefined,
      paginationLimit,
      onlyHighlight ? 'highlight' : undefined
    );

    setNotificationTimeline((currentTimeline) => {
      // Nothing loaded yet, just seed the state normally.
      if (currentTimeline.groups.length === 0) {
        return {
          nextToken: data.next_token,
          groups: groupNotifications(data.notifications, allJoinedRooms),
        };
      }

      const existingIds = new Set<string>();
      currentTimeline.groups.forEach((group) => {
        group.notifications.forEach((n) => existingIds.add(n.event.event_id));
      });

      const newNotifications = data.notifications.filter((n) => !existingIds.has(n.event.event_id));

      // Nothing changed — return the same reference so consumers relying
      // on identity (e.g. memoized lists) don't needlessly re-render.
      if (newNotifications.length === 0) {
        return currentTimeline;
      }

      const newGroups = groupNotifications(newNotifications, allJoinedRooms);

      const lastNewGroup = newGroups[newGroups.length - 1];
      const firstExistingGroup = currentTimeline.groups[0];

      // Merge into the existing first group if it's the same room, so we
      // don't end up with two adjacent groups for the same room.
      if (lastNewGroup && firstExistingGroup?.roomId === lastNewGroup.roomId) {
        const mergedGroup: RoomNotificationsGroup = {
          roomId: firstExistingGroup.roomId,
          notifications: [...lastNewGroup.notifications, ...firstExistingGroup.notifications],
        };
        return {
          nextToken: currentTimeline.nextToken,
          groups: [...newGroups.slice(0, -1), mergedGroup, ...currentTimeline.groups.slice(1)],
        };
      }

      return {
        nextToken: currentTimeline.nextToken,
        groups: [...newGroups, ...currentTimeline.groups],
      };
    });
  }, [paginationLimit, onlyHighlight, fetchNotifications, allJoinedRooms]);

  return [notificationTimeline, loadTimeline, silentReloadTimeline];
};

type RoomNotificationsProps = {
  roomId: string;
  timeline?: Timeline;
  notifications: NotificationChunk[];
  mediaAutoLoad?: boolean;
  urlPreview?: boolean;
  legacyUsernameColor?: boolean;
  hour24Clock: boolean;
  dateFormatString: string;
  getRoomName: GetRoomNameCallback;
  onOpen: (roomId: string, eventId: string) => void;
};
function RoomNotifications({
  roomId,
  timeline,
  notifications,
  mediaAutoLoad,
  urlPreview,
  legacyUsernameColor,
  hour24Clock,
  dateFormatString,
  getRoomName,
  onOpen,
}: RoomNotificationsProps) {
  const ct = useClient();
  const membersAPI = useRoomMembersAPI();
  const useAuthentication = useMediaAuthentication();

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
    membersAPI.getName
  );

  const handleOpenClick: MouseEventHandler = (evt) => {
    const eventId = evt.currentTarget.getAttribute('data-event-id');
    if (!eventId) return;
    onOpen(roomId, eventId);
  };

  return (
    <Box direction="Column" gap="100">
      {notifications.map((notification) => {
        const { event } = notification;

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
            key={notification.event.event_id}
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

type RoomNotificationsGroupProps = {
  roomId: string;
  notifications: NotificationChunk[];
  getRoomName: GetRoomNameCallback;
  getRoomAvatar: GetRoomAvatarCallback;
  hideActivity: boolean;
  children: ReactNode;
};
function RoomNotificationsGroupComp({
  roomId,
  notifications,
  getRoomName,
  getRoomAvatar,
  hideActivity,
  children,
}: RoomNotificationsGroupProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const unread = useRoomUnread(roomId, unreadRoomsAtom);

  const users = useMemo(
    () => Array.from(new Set(notifications.map((n) => n.event.sender))),
    [notifications]
  );

  const avatarMxc = getRoomAvatar(roomId);

  const powerLevelStateResult = usePowerLevelsState(roomId);
  const powerLevels = usePowerLevels(powerLevelStateResult.value);

  const powerLevelTagsStateResult = usePowerLevelTagsState(roomId);
  const powerLevelTags = usePowerLevelTags(powerLevels, powerLevelTagsStateResult.value);

  const membersAPI = useRoomMembers(roomId, users);

  const handleMarkAsRead = () => {
    // markAsRead(mx, room.roomId, hideActivity);
  };

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
        <Box shrink="No">
          {unread && (
            <Chip
              variant="Primary"
              radii="Pill"
              onClick={handleMarkAsRead}
              before={<Icon size="100" src={Icons.CheckTwice} />}
            >
              <Text size="T200">Mark as Read</Text>
            </Chip>
          )}
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

const useNotificationsSearchParams = (
  searchParams: URLSearchParams
): InboxNotificationsPathSearchParams =>
  useMemo(
    () => ({
      only: searchParams.get('only') ?? undefined,
    }),
    [searchParams]
  );

const DEFAULT_REFRESH_MS = 7000;

export function Notifications() {
  const ct = useClient();

  const {
    hideActivity,
    mediaAutoLoad,
    urlPreview,
    legacyUsernameColor,
    hour24Clock,
    dateFormatString,
  } = useSettings();
  const screenSize = useScreenSizeContext();
  const mDirects = useAtomValue(mDirectAtom);

  const { navigateRoom } = useRoomNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const notificationsSearchParams = useNotificationsSearchParams(searchParams);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTopAnchorRef = useRef<HTMLDivElement>(null);
  const [refreshIntervalTime, setRefreshIntervalTime] = useState(DEFAULT_REFRESH_MS);

  const onlyHighlight = notificationsSearchParams.only === 'highlight';
  const setOnlyHighlighted = (highlight: boolean) => {
    if (highlight) {
      setSearchParams(new URLSearchParams({ only: 'highlight' }));
      return;
    }
    setSearchParams();
  };

  const [notificationTimeline, _loadTimeline, silentReloadTimeline] = useNotificationTimeline(
    24,
    onlyHighlight
  );
  const [timelineState, loadTimeline] = useAsyncCallback(_loadTimeline);

  const virtualizer = useVirtualizer({
    count: notificationTimeline.groups.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 4,
  });
  const vItems = virtualizer.getVirtualItems();

  useInterval(
    useCallback(() => {
      silentReloadTimeline();
    }, [silentReloadTimeline]),
    refreshIntervalTime
  );

  const handleScrollTopVisibility = useCallback(
    (onTop: boolean) => setRefreshIntervalTime(onTop ? DEFAULT_REFRESH_MS : -1),
    []
  );

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const lastVItem = vItems[vItems.length - 1];
  const lastVItemIndex: number | undefined = lastVItem?.index;
  useEffect(() => {
    if (
      timelineState.status === AsyncStatus.Success &&
      notificationTimeline.groups.length - 1 === lastVItemIndex &&
      notificationTimeline.nextToken
    ) {
      loadTimeline(notificationTimeline.nextToken);
    }
  }, [timelineState, notificationTimeline, lastVItemIndex, loadTimeline]);

  const notificationRooms = useMemo(
    () => Array.from(new Set(notificationTimeline.groups.map((g) => g.roomId))),
    [notificationTimeline]
  );

  const roomToTimeline = useObservableValue(ct.roomToTimeline);
  const [getRoomHeroes, roomToHeroMembersResult] = useRoomHeroes(notificationRooms);
  const getRoomName = useGetRoomName(getRoomHeroes, roomToHeroMembersResult.value);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes, roomToHeroMembersResult.value);

  return (
    <Page>
      <PageHeader balance>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" basis="No">
            {screenSize === ScreenSize.Mobile && (
              <BackRouteHandler>
                {(onBack) => (
                  <IconButton onClick={onBack}>
                    <Icon src={Icons.ArrowLeft} />
                  </IconButton>
                )}
              </BackRouteHandler>
            )}
          </Box>
          <Box alignItems="Center" gap="200">
            {screenSize !== ScreenSize.Mobile && <Icon size="400" src={Icons.Message} />}
            <Text size="H3" truncate>
              Notification Messages
            </Text>
          </Box>
          <Box grow="Yes" basis="No" />
        </Box>
      </PageHeader>

      <Box style={{ position: 'relative' }} grow="Yes">
        <Scroll ref={scrollRef} hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <Box direction="Column" gap="200">
                <Box ref={scrollTopAnchorRef} direction="Column" gap="100">
                  <span data-spacing-node />
                  <Text size="L400">Filter</Text>
                  <Box gap="200">
                    <Chip
                      onClick={() => setOnlyHighlighted(false)}
                      variant={!onlyHighlight ? 'Success' : 'Surface'}
                      aria-pressed={!onlyHighlight}
                      before={!onlyHighlight && <Icon size="100" src={Icons.Check} />}
                      outlined
                    >
                      <Text size="T200">All Notifications</Text>
                    </Chip>
                    <Chip
                      onClick={() => setOnlyHighlighted(true)}
                      variant={onlyHighlight ? 'Success' : 'Surface'}
                      aria-pressed={onlyHighlight}
                      before={onlyHighlight && <Icon size="100" src={Icons.Check} />}
                      outlined
                    >
                      <Text size="T200">Highlighted</Text>
                    </Chip>
                  </Box>
                </Box>
                <ScrollTopContainer
                  scrollRef={scrollRef}
                  anchorRef={scrollTopAnchorRef}
                  onVisibilityChange={handleScrollTopVisibility}
                >
                  <IconButton
                    onClick={() => virtualizer.scrollToOffset(0)}
                    variant="SurfaceVariant"
                    radii="Pill"
                    outlined
                    size="300"
                    aria-label="Scroll to Top"
                  >
                    <Icon src={Icons.ChevronTop} size="300" />
                  </IconButton>
                </ScrollTopContainer>
                <div
                  style={{
                    position: 'relative',
                    height: virtualizer.getTotalSize(),
                  }}
                >
                  {vItems.map((vItem) => {
                    const group = notificationTimeline.groups[vItem.index];
                    if (!group) return null;

                    return (
                      <VirtualTile
                        virtualItem={vItem}
                        style={{ paddingTop: config.space.S500 }}
                        ref={virtualizer.measureElement}
                        key={vItem.index}
                      >
                        <RoomNotificationsGroupComp
                          roomId={group.roomId}
                          notifications={group.notifications}
                          getRoomName={getRoomName}
                          getRoomAvatar={getRoomAvatar}
                          hideActivity={hideActivity}
                        >
                          <RoomNotifications
                            roomId={group.roomId}
                            timeline={roomToTimeline.get(group.roomId)}
                            notifications={group.notifications}
                            mediaAutoLoad={mediaAutoLoad}
                            urlPreview={urlPreview}
                            onOpen={navigateRoom}
                            legacyUsernameColor={legacyUsernameColor || mDirects.has(group.roomId)}
                            hour24Clock={hour24Clock}
                            dateFormatString={dateFormatString}
                            getRoomName={getRoomName}
                          />
                        </RoomNotificationsGroupComp>
                      </VirtualTile>
                    );
                  })}
                </div>

                {timelineState.status === AsyncStatus.Success &&
                  notificationTimeline.groups.length === 0 && (
                    <Box
                      className={ContainerColor({ variant: 'SurfaceVariant' })}
                      style={{
                        padding: config.space.S300,
                        borderRadius: config.radii.R400,
                      }}
                      direction="Column"
                      gap="200"
                    >
                      <Text>No Notifications</Text>
                      <Text size="T200">
                        You don&apos;t have any new notifications to display yet.
                      </Text>
                    </Box>
                  )}

                {timelineState.status === AsyncStatus.Loading && (
                  <Box direction="Column" gap="100">
                    {[...Array(8).keys()].map((key) => (
                      <SequenceCard
                        variant="SurfaceVariant"
                        key={key}
                        style={{ minHeight: toRem(80) }}
                      />
                    ))}
                  </Box>
                )}
                {timelineState.status === AsyncStatus.Error && (
                  <Box
                    className={ContainerColor({ variant: 'Critical' })}
                    style={{
                      padding: config.space.S300,
                      borderRadius: config.radii.R400,
                    }}
                    direction="Column"
                    gap="200"
                  >
                    <Text size="L400">
                      {timelineState.error instanceof Error
                        ? timelineState.error.message
                        : 'Unknown Error'}
                    </Text>
                  </Box>
                )}
              </Box>
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
