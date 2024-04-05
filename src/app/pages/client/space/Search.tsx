import React, { useRef } from 'react';
import { Box, Icon, Icons, Text, Scroll } from 'folds';
import { useAtomValue } from 'jotai';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { MessageSearch } from '../../../features/message-search';
import { useSpace } from '../../../hooks/useSpace';
import { useRecursiveChildRoomScopeFactory, useSpaceChildren } from '../../../state/hooks/roomList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { useMatrixClient } from '../../../hooks/useMatrixClient';

export function SpaceSearch() {
  const mx = useMatrixClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const space = useSpace();

  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const rooms = useSpaceChildren(
    allRoomsAtom,
    space.roomId,
    useRecursiveChildRoomScopeFactory(mx, mDirects, roomToParents)
  );

  return (
    <Page>
      <PageHeader>
        <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
          <Icon size="400" src={Icons.Search} />
          <Text size="H3" truncate>
            Message Search
          </Text>
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
