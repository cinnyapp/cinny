import React, { useCallback, useRef, useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Box,
  Chip,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Scroll,
  Text,
  color,
  config,
} from 'folds';
import { Room } from 'matrix-js-sdk';
import { useVirtualizer } from '@tanstack/react-virtual';
import millify from 'millify';

import * as css from './MembersDrawer.css';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  getIntersectionObserverEntry,
  useIntersectionObserver,
} from '../../hooks/useIntersectionObserver';

type MembersDrawerProps = {
  room: Room;
};
export function MembersDrawer({ room }: MembersDrawerProps) {
  const mx = useMatrixClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const filterOptionsRef = useRef<HTMLDivElement>(null);
  const members = useRoomMembers(mx, room.roomId);
  const [onTop, setOnTop] = useState(true);

  const virtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  useIntersectionObserver(
    useCallback((intersectionEntries) => {
      if (!filterOptionsRef.current) return;
      const entry = getIntersectionObserverEntry(filterOptionsRef.current, intersectionEntries);
      if (entry) setOnTop(entry.isIntersecting);
    }, []),
    useCallback(() => ({ root: scrollRef.current }), []),
    useCallback(() => filterOptionsRef.current, [])
  );

  // const groupedMembers: RoomMember[] = useMemo(() => {
  //   const sorted
  //   const m: RoomMember[] = [];
  // }, [members]);

  return (
    <Box className={css.MembersDrawer} direction="Column">
      <Header className={css.MembersDrawerHeader} variant="Background" size="600">
        <Box grow="Yes" alignItems="Center" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H5" truncate>
              {`${millify(room.getJoinedMemberCount(), { precision: 1 })} Members`}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center">
            <IconButton variant="Background">
              <Icon src={Icons.UserPlus} />
            </IconButton>
          </Box>
        </Box>
      </Header>
      <Box className={css.MemberDrawerContentBase} grow="Yes">
        <Scroll ref={scrollRef} variant="Background" size="300" visibility="Hover">
          <Box className={css.MemberDrawerContent} direction="Column" gap="400">
            <Box className={css.DrawerGroup} direction="Column" gap="100">
              <Text size="L400">Search</Text>
              <Input placeholder="Type name..." variant="Surface" size="300" outlined />
            </Box>

            <Box ref={filterOptionsRef} className={css.DrawerGroup} direction="Column" gap="100">
              <Text size="L400">Filter</Text>
              <Box alignItems="Center" gap="100">
                <Chip
                  variant="Primary"
                  radii="Pill"
                  outlined
                  after={<Icon src={Icons.ChevronBottom} size="50" />}
                >
                  <Text size="T200">Joined</Text>
                </Chip>
                <Chip
                  variant="Surface"
                  radii="Pill"
                  outlined
                  after={<Icon src={Icons.ChevronBottom} size="50" />}
                >
                  <Text size="T200">Sort</Text>
                </Chip>
              </Box>
            </Box>

            {!onTop && (
              <Box className={css.DrawerScrollTop}>
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
              </Box>
            )}

            <Box className={css.MembersGroup} direction="Column" gap="100">
              <Text className={css.MembersGroupLabel} size="L400">
                Admins
              </Text>
              <div
                style={{
                  position: 'relative',
                  height: virtualizer.getTotalSize(),
                }}
              >
                {virtualizer.getVirtualItems().map((vItem) => {
                  const member = members[vItem.index];
                  const avatarUrl = member.getAvatarUrl(
                    mx.baseUrl,
                    100,
                    100,
                    'crop',
                    undefined,
                    false
                  );

                  return (
                    <Box
                      style={{
                        padding: config.space.S200,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${vItem.start}px)`,
                      }}
                      data-index={vItem.index}
                      ref={virtualizer.measureElement}
                      key={`${room.roomId}-${vItem.key}`}
                      alignItems="Center"
                      gap="200"
                    >
                      <Avatar size="200">
                        {avatarUrl ? (
                          <AvatarImage src={avatarUrl} />
                        ) : (
                          <AvatarFallback
                            style={{
                              background: color.Secondary.Container,
                              color: color.Secondary.OnContainer,
                            }}
                          >
                            <Text size="T200">{member.name[0]}</Text>
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <Text size="T400" truncate>
                        {member.name}
                      </Text>
                    </Box>
                  );
                })}
              </div>
            </Box>
          </Box>
        </Scroll>
      </Box>
    </Box>
  );
}
