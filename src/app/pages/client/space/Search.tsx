import React, { useRef } from 'react';
import { Box, Icon, Icons, Text, Scroll, IconButton } from 'folds';
import { useAtomValue } from 'jotai';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { MessageSearch } from '../../../features/message-search';
import { useSpace } from '../../../hooks/useSpace';
import { useRecursiveChildRoomScopeFactory, useSpaceChildren } from '../../../state/hooks/roomList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';

export function SpaceSearch() {
  const mx = useMatrixClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const space = useSpace();
  const screenSize = useScreenSizeContext();

  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const rooms = useSpaceChildren(
    allRoomsAtom,
    space.roomId,
    useRecursiveChildRoomScopeFactory(mx, mDirects, roomToParents)
  );

  return (
    <Page>
      <PageHeader balance>
        <Box grow="Yes" alignItems="Center" gap="200">
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
          <Box justifyContent="Center" alignItems="Center" gap="200">
            {screenSize !== ScreenSize.Mobile && <Icon size="400" src={Icons.Search} />}
            <Text size="H3" truncate>
              Message Search
            </Text>
          </Box>
          <Box grow="Yes" basis="No" />
        </Box>
      </PageHeader>
      <Box style={{ position: 'relative' }} grow="Yes">
        <Scroll ref={scrollRef} hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <MessageSearch
                defaultRoomsFilterName={space.name}
                allowGlobal
                rooms={rooms}
                scrollRef={scrollRef}
              />
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
