import React, { useCallback, useRef, useState } from 'react';
import { Box, Icon, IconButton, Icons, Line, Scroll, Text, config } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtom } from 'jotai';
import { useSpace } from '../../hooks/useSpace';
import { Page, PageContent, PageContentCenter, PageHeroSection } from '../../components/page';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useSpaceHierarchy } from '../../pages/client/space/useSpaceHierarchy';
import {
  HierarchyRoomSummaryLoader,
  LocalRoomSummaryLoader,
} from '../../components/RoomSummaryLoader';
import { VirtualTile } from '../../components/virtualizer';
import { spaceRoomsAtom } from '../../state/spaceRooms';
import { MembersDrawer } from '../room/MembersDrawer';
import { useSetting } from '../../state/hooks/settings';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import { settingsAtom } from '../../state/settings';
import { LobbyHeader } from './LobbyHeader';
import { LobbyHero } from './LobbyHero';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { useElementSizeObserver } from '../../hooks/useElementSizeObserver';
import { PowerLevelsContextProvider, usePowerLevels } from '../../hooks/usePowerLevels';
import { HierarchyItemCard } from './HierarchyItem';

export function Lobby() {
  const mx = useMatrixClient();
  const space = useSpace();
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const [heroSectionHeight, setHeroSectionHeight] = useState<number>();
  const [spaceRooms, setSpaceRooms] = useAtom(spaceRoomsAtom);
  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const screenSize = useScreenSize();
  const [onTop, setOnTop] = useState(true);
  const powerLevelAPI = usePowerLevels(space);

  useElementSizeObserver(
    useCallback(() => heroSectionRef.current, []),
    useCallback((w, height) => setHeroSectionHeight(height), [])
  );

  const flattenHierarchy = useSpaceHierarchy(space.roomId, spaceRooms);

  const virtualizer = useVirtualizer({
    count: flattenHierarchy.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 1,
    overscan: 2,
    paddingStart: heroSectionHeight ?? 258,
  });
  const vItems = virtualizer.getVirtualItems();

  const addSpaceRoom = (roomId: string) => setSpaceRooms({ type: 'PUT', roomId });

  return (
    <PowerLevelsContextProvider value={powerLevelAPI}>
      <Box grow="Yes">
        <Page>
          <LobbyHeader showProfile={!onTop} />
          <Box style={{ position: 'relative' }} grow="Yes">
            <Scroll ref={scrollRef} hideTrack visibility="Hover">
              <PageContent>
                <PageContentCenter>
                  <ScrollTopContainer
                    scrollRef={scrollRef}
                    anchorRef={heroSectionRef}
                    onVisibilityChange={setOnTop}
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
                    <PageHeroSection ref={heroSectionRef} style={{ paddingTop: 0 }}>
                      <LobbyHero />
                    </PageHeroSection>
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
    </PowerLevelsContextProvider>
  );
}
