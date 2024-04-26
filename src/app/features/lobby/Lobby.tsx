import React, { useEffect, useRef } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Line,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Scroll,
  Text,
  as,
  config,
  toRem,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtom } from 'jotai';
import FocusTrap from 'focus-trap-react';
import { useSpace } from '../../hooks/useSpace';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../components/page';
import { RoomAvatar } from '../../components/room-avatar';
import { SequenceCard } from '../../components/sequence-card';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomAvatar, useRoomName } from '../../hooks/useRoomMeta';
import { nameInitials } from '../../utils/common';
import { HierarchyItem, useSpaceHierarchy } from '../../pages/client/space/useSpaceHierarchy';
import { millify } from '../../plugins/millify';
import {
  HierarchyRoomSummaryLoader,
  LocalRoomSummaryLoader,
} from '../../components/RoomSummaryLoader';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import { onEnterOrSpace } from '../../utils/keyboard';
import { VirtualTile } from '../../components/virtualizer';
import { spaceRoomsAtom } from '../../state/spaceRooms';
import { Membership, RoomType } from '../../../types/matrix/room';
import * as css from './style.css';
import { MembersDrawer } from '../room/MembersDrawer';
import { useSetting } from '../../state/hooks/settings';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import { settingsAtom } from '../../state/settings';

type RoomProfileProps = {
  name: string;
  topic?: string;
  avatarUrl?: string;
  suggested?: boolean;
  memberCount?: number;
};
function RoomProfile({ name, topic, avatarUrl, suggested, memberCount }: RoomProfileProps) {
  return (
    <Box grow="Yes" gap="300">
      <Avatar>
        <RoomAvatar
          src={avatarUrl}
          alt={name}
          renderInitials={() => <Text size="H4">{nameInitials(name)}</Text>}
        />
      </Avatar>
      <Box grow="Yes" direction="Column">
        <Box gap="200" alignItems="Center">
          <Text size="H5" truncate>
            {name}
          </Text>
          {suggested && (
            <Box shrink="No" alignItems="Center">
              <Badge variant="Success" fill="Soft" outlined>
                <Text size="L400">Suggested</Text>
              </Badge>
            </Box>
          )}
        </Box>
        <Box gap="200" alignItems="Center">
          {memberCount && (
            <Box shrink="No" gap="200">
              <Text size="T200" priority="300">{`${millify(memberCount)} Members`}</Text>
            </Box>
          )}
          {memberCount && topic && (
            <Line
              variant="SurfaceVariant"
              style={{ height: toRem(12) }}
              direction="Vertical"
              size="400"
            />
          )}
          {topic && (
            <UseStateProvider initial={false}>
              {(view, setView) => (
                <>
                  <Text
                    className={css.RoomProfileTopic}
                    size="T200"
                    priority="300"
                    truncate
                    onClick={() => setView(true)}
                    onKeyDown={onEnterOrSpace(() => setView(true))}
                    tabIndex={0}
                  >
                    {topic}
                  </Text>
                  <Overlay open={view} backdrop={<OverlayBackdrop />}>
                    <OverlayCenter>
                      <FocusTrap
                        focusTrapOptions={{
                          initialFocus: false,
                          clickOutsideDeactivates: true,
                          onDeactivate: () => setView(false),
                        }}
                      >
                        <RoomTopicViewer
                          name={name}
                          topic={topic}
                          requestClose={() => setView(false)}
                        />
                      </FocusTrap>
                    </OverlayCenter>
                  </Overlay>
                </>
              )}
            </UseStateProvider>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function CallbackOnFoundSpace({
  roomId,
  onSpaceFound,
}: {
  roomId: string;
  onSpaceFound: (roomId: string) => void;
}) {
  useEffect(() => {
    onSpaceFound(roomId);
  }, [roomId, onSpaceFound]);

  return null;
}

type HierarchyItemCardProps = {
  item: HierarchyItem;
  onSpaceFound: (roomId: string) => void;
};
const HierarchyItemCard = as<'div', HierarchyItemCardProps>(
  ({ item, onSpaceFound, style, ...props }, ref) => {
    const mx = useMatrixClient();
    const { roomId, content } = item;
    const room = mx.getRoom(roomId);

    const joined = room?.getMyMembership() === Membership.Join;

    return (
      <SequenceCard
        style={{ padding: config.space.S400, style }}
        variant="SurfaceVariant"
        gap="300"
        alignItems="Center"
        {...props}
        ref={ref}
      >
        {room ? (
          <LocalRoomSummaryLoader room={room}>
            {(localSummary) => (
              <RoomProfile
                name={localSummary.name}
                topic={localSummary.topic}
                avatarUrl={
                  localSummary.avatarUrl
                    ? mx.mxcUrlToHttp(localSummary.avatarUrl, 96, 96, 'crop') ?? undefined
                    : undefined
                }
                memberCount={localSummary.memberCount}
                suggested={content.suggested}
              />
            )}
          </LocalRoomSummaryLoader>
        ) : (
          <HierarchyRoomSummaryLoader roomId={roomId}>
            {(summary) => (
              <>
                {summary?.room_type === RoomType.Space && (
                  <CallbackOnFoundSpace roomId={summary.room_id} onSpaceFound={onSpaceFound} />
                )}
                <RoomProfile
                  name={summary?.name ?? roomId}
                  topic={summary?.topic}
                  avatarUrl={
                    summary?.avatar_url
                      ? mx.mxcUrlToHttp(summary.avatar_url, 96, 96, 'crop') ?? undefined
                      : undefined
                  }
                  memberCount={summary?.num_joined_members}
                  suggested={content.suggested}
                />
              </>
            )}
          </HierarchyRoomSummaryLoader>
        )}
        <Box shrink="No">
          <Text style={{ color: joined ? 'green' : 'red' }}>{joined ? 'JOINED' : 'NOT'}</Text>
        </Box>
      </SequenceCard>
    );
  }
);

export function Lobby() {
  const mx = useMatrixClient();
  const space = useSpace();
  const spaceName = useRoomName(space);
  const avatarMxc = useRoomAvatar(space);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [spaceRooms, setSpaceRooms] = useAtom(spaceRoomsAtom);
  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const screenSize = useScreenSize();

  const flattenHierarchy = useSpaceHierarchy(space.roomId, spaceRooms);

  const virtualizer = useVirtualizer({
    count: flattenHierarchy.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 1,
    overscan: 2,
  });
  const vItems = virtualizer.getVirtualItems();

  const addSpaceRoom = (roomId: string) => setSpaceRooms({ type: 'PUT', roomId });

  return (
    <Box grow="Yes">
      <Page>
        <PageHeader>
          <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
            <Avatar size="300">
              <RoomAvatar
                src={
                  avatarMxc ? mx.mxcUrlToHttp(avatarMxc, 96, 96, 'crop') ?? undefined : undefined
                }
                alt={spaceName}
                renderInitials={() => <Text size="H4">{nameInitials(spaceName)}</Text>}
              />
            </Avatar>
            <Text size="H3" truncate>
              {spaceName}
            </Text>
          </Box>
        </PageHeader>
        <Box style={{ position: 'relative' }} grow="Yes">
          <Scroll ref={scrollRef} hideTrack visibility="Hover">
            <PageContent>
              <PageContentCenter>
                <div
                  style={{
                    position: 'relative',
                    height: virtualizer.getTotalSize(),
                  }}
                >
                  {vItems.map((vItem) => {
                    const item = flattenHierarchy[vItem.index];
                    if (!item) return null;
                    const { roomId } = item;
                    const room = mx.getRoom(roomId);

                    if (item.space)
                      return (
                        <VirtualTile
                          virtualItem={vItem}
                          style={{ paddingTop: config.space.S500 }}
                          ref={virtualizer.measureElement}
                          key={vItem.index}
                        >
                          {room ? (
                            <LocalRoomSummaryLoader room={room}>
                              {(summary) => (
                                <Text size="H4" style={{ color: 'red', paddingTop: 8 }}>
                                  {summary.name}
                                </Text>
                              )}
                            </LocalRoomSummaryLoader>
                          ) : (
                            <HierarchyRoomSummaryLoader roomId={roomId}>
                              {(summary) => (
                                <Text size="H4" style={{ color: 'red', paddingTop: 8 }}>
                                  {summary?.name ?? roomId}
                                </Text>
                              )}
                            </HierarchyRoomSummaryLoader>
                          )}
                        </VirtualTile>
                      );

                    return (
                      <VirtualTile
                        virtualItem={vItem}
                        style={{ paddingTop: config.space.S100 }}
                        ref={virtualizer.measureElement}
                        key={vItem.index}
                      >
                        <HierarchyItemCard item={item} onSpaceFound={addSpaceRoom} />
                      </VirtualTile>
                    );
                  })}
                </div>
              </PageContentCenter>
            </PageContent>
          </Scroll>
        </Box>
      </Page>
      {screenSize === ScreenSize.Desktop && isDrawer && (
        <>
          <Line variant="Background" direction="Vertical" size="300" />
          <MembersDrawer room={space} />
        </>
      )}
    </Box>
  );
}
