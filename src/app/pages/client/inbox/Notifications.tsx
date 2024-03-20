import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { INotification, INotificationsResponse, Method } from 'matrix-js-sdk';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdLocalPart } from '../../../utils/matrix';
import { InboxNotificationsPathSearchParams } from '../../paths';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { SequenceCard } from '../../../components/sequence-card';
import { RoomAvatar } from '../../../components/room-avatar';
import { nameInitials } from '../../../utils/common';
import { getRoomAvatarUrl } from '../../../utils/room';
import { ScrollTopContainer } from '../../../components/scroll-top-container';

type RoomNotificationsGroup = {
  roomId: string;
  notifications: INotification[];
};
type NotificationTimeline = {
  nextToken?: string;
  groups: RoomNotificationsGroup[];
};
type LoadTimeline = (from?: string) => Promise<void>;

const groupNotifications = (notifications: INotification[]): RoomNotificationsGroup[] => {
  const groups: RoomNotificationsGroup[] = [];
  notifications.forEach((notification) => {
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
): [NotificationTimeline, LoadTimeline] => {
  const mx = useMatrixClient();
  const [notificationTimeline, setNotificationTimeline] = useState<NotificationTimeline>({
    groups: [],
  });

  const fetchNotifications = useCallback(
    (from?: string, limit?: number, only?: 'highlight') => {
      const queryParams = { from, limit, only };
      return mx.http.authedRequest<INotificationsResponse>(
        Method.Get,
        '/notifications',
        queryParams
      );
    },
    [mx]
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
      const groups = groupNotifications(data.notifications);

      setNotificationTimeline((currentTimeline) => ({
        nextToken: data.next_token,
        groups: from ? currentTimeline.groups.concat(groups) : groups,
      }));
    },
    [paginationLimit, onlyHighlight, fetchNotifications]
  );

  return [notificationTimeline, loadTimeline];
};

const getNotificationsSearchParams = (
  searchParams: URLSearchParams
): InboxNotificationsPathSearchParams => ({
  only: searchParams.get('only') ?? undefined,
});
export function Notifications() {
  const mx = useMatrixClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const notificationsSearchParams = getNotificationsSearchParams(searchParams);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTopAnchorRef = useRef<HTMLDivElement>(null);

  const onlyHighlight = notificationsSearchParams.only === 'highlight';
  const setOnlyHighlighted = (highlight: boolean) => {
    if (highlight) {
      setSearchParams(
        new URLSearchParams({
          only: 'highlight',
        })
      );
      return;
    }
    setSearchParams();
  };

  const [notificationTimeline, _loadTimeline] = useNotificationTimeline(24, onlyHighlight);
  const [timelineState, loadTimeline] = useAsyncCallback(_loadTimeline);

  const virtualizer = useVirtualizer({
    count: notificationTimeline.groups.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 4,
  });
  const vItems = virtualizer.getVirtualItems();

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  useEffect(() => {
    const lastItem = vItems[vItems.length - 1];
    if (
      timelineState.status === AsyncStatus.Success &&
      lastItem &&
      notificationTimeline.groups.length - 1 === lastItem.index &&
      notificationTimeline.nextToken
    ) {
      loadTimeline(notificationTimeline.nextToken);
    }
  }, [timelineState, notificationTimeline, vItems, loadTimeline]);

  return (
    <Page>
      <PageHeader>
        <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
          <Icon size="400" src={Icons.Message} />
          <Text size="H3" truncate>
            Notification Messages
          </Text>
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
                    <Box grow="Yes" data-spacing-node />
                    <Chip
                      onClick={() => loadTimeline()}
                      radii="Pill"
                      size="400"
                      variant="SurfaceVariant"
                      after={<Icon size="50" src={Icons.ArrowBottom} />}
                    >
                      <Text size="T200" truncate>
                        Refresh
                      </Text>
                    </Chip>
                  </Box>
                </Box>
                <ScrollTopContainer scrollRef={scrollRef} anchorRef={scrollTopAnchorRef}>
                  <IconButton
                    onClick={() => virtualizer.scrollToOffset(0)}
                    variant="Surface"
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
                    const groupRoom = mx.getRoom(group.roomId);
                    if (!groupRoom) return null;
                    // TODO: instead of null return empty div to measure element
                    // extract scroll to top floating btn component from MemberDrawer component

                    return (
                      <Box
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${vItem.start}px)`,
                          paddingTop: config.space.S400,
                        }}
                        data-index={vItem.index}
                        ref={virtualizer.measureElement}
                        key={vItem.index}
                        direction="Column"
                        gap="200"
                      >
                        <Header size="300">
                          <Box gap="200">
                            <Avatar size="200">
                              <RoomAvatar
                                variant="SurfaceVariant"
                                src={getRoomAvatarUrl(mx, groupRoom, 96)}
                                alt={groupRoom.name}
                                renderInitials={() => (
                                  <Text as="span" size="H6">
                                    {nameInitials(groupRoom.name)}
                                  </Text>
                                )}
                              />
                            </Avatar>
                            <Text size="H4">{groupRoom.name}</Text>
                          </Box>
                        </Header>
                        <Box direction="Column" gap="100">
                          {group.notifications.map((notification) => (
                            <SequenceCard
                              key={notification.event.event_id}
                              style={{ padding: `${config.space.S300} ${config.space.S400}` }}
                              direction="Column"
                              gap="200"
                            >
                              <Text>
                                {getMxIdLocalPart(notification.event.sender)}
                                {notification.read ? undefined : '- UNREAD'}
                              </Text>
                              <Text size="T300">{notification.event.content.body}</Text>
                            </SequenceCard>
                          ))}
                        </Box>
                      </Box>
                    );
                  })}
                </div>

                {timelineState.status === AsyncStatus.Loading && (
                  <Box direction="Column" gap="100">
                    {[...Array(8).keys()].map((key) => (
                      <SequenceCard key={key} style={{ minHeight: toRem(80) }} />
                    ))}
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
