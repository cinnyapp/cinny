import FocusTrap from 'focus-trap-react';
import {
  Avatar,
  Box,
  Button,
  config,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Menu,
  MenuItem,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Scroll,
  Spinner,
  Text,
} from 'folds';
import React, {
  ChangeEventHandler,
  MouseEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAtomValue } from 'jotai';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Room } from 'matrix-js-sdk';
import { stopPropagation } from '../../utils/keyboard';
import { useDirects, useRooms, useSpaces } from '../../state/hooks/roomList';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { mDirectAtom } from '../../state/mDirectList';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { useAllJoinedRoomsSet, useGetRoom } from '../../hooks/useGetRoom';
import { VirtualTile } from '../../components/virtualizer';
import { getDirectRoomAvatarUrl, getRoomAvatarUrl } from '../../utils/room';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { nameInitials } from '../../utils/common';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { factoryRoomIdByAtoZ } from '../../utils/sort';
import {
  SearchItemStrGetter,
  useAsyncSearch,
  UseAsyncSearchOptions,
} from '../../hooks/useAsyncSearch';
import { highlightText, makeHighlightRegex } from '../../plugins/react-custom-html-parser';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { StateEvent } from '../../../types/matrix/room';
import { getViaServers } from '../../plugins/via-servers';
import { rateLimitedActions } from '../../utils/matrix';
import { useAlive } from '../../hooks/useAlive';

const SEARCH_OPTS: UseAsyncSearchOptions = {
  limit: 500,
  matchOptions: {
    contain: true,
  },
  normalizeOptions: {
    ignoreWhitespace: false,
  },
};

type AddExistingModalProps = {
  parentId: string;
  space?: boolean;
  requestClose: () => void;
};
export function AddExistingModal({ parentId, space, requestClose }: AddExistingModalProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const alive = useAlive();

  const mDirects = useAtomValue(mDirectAtom);
  const spaces = useSpaces(mx, allRoomsAtom);
  const rooms = useRooms(mx, allRoomsAtom, mDirects);
  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const roomIdToParents = useAtomValue(roomToParentsAtom);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selected, setSelected] = useState<string[]>([]);

  const allRoomsSet = useAllJoinedRoomsSet();
  const getRoom = useGetRoom(allRoomsSet);

  const allItems: string[] = useMemo(() => {
    const rIds = space ? [...spaces] : [...rooms, ...directs];

    return rIds
      .filter((rId) => rId !== parentId && !roomIdToParents.get(rId)?.has(parentId))
      .sort(factoryRoomIdByAtoZ(mx));
  }, [spaces, rooms, directs, space, parentId, roomIdToParents, mx]);

  const getRoomNameStr: SearchItemStrGetter<string> = useCallback(
    (rId) => getRoom(rId)?.name ?? rId,
    [getRoom]
  );

  const [searchResult, searchRoom, resetSearch] = useAsyncSearch(
    allItems,
    getRoomNameStr,
    SEARCH_OPTS
  );
  const queryHighlighRegex = searchResult?.query
    ? makeHighlightRegex(searchResult.query.split(' '))
    : undefined;

  const items = searchResult ? searchResult.items : allItems;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 5,
  });
  const vItems = virtualizer.getVirtualItems();

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const value = evt.currentTarget.value.trim();
    if (!value) {
      resetSearch();
      return;
    }
    searchRoom(value);
  };

  const [applyState, applyChanges] = useAsyncCallback<undefined, Error, [Room[]]>(
    useCallback(
      async (selectedRooms) => {
        await rateLimitedActions(selectedRooms, async (room) => {
          const via = getViaServers(room);

          await mx.sendStateEvent(
            parentId,
            StateEvent.SpaceChild as any,
            {
              auto_join: false,
              suggested: false,
              via,
            },
            room.roomId
          );
        });
      },
      [mx, parentId]
    )
  );
  const applyingChanges = applyState.status === AsyncStatus.Loading;

  const handleRoomClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const roomId = evt.currentTarget.getAttribute('data-room-id');
    if (!roomId) return;
    if (selected?.includes(roomId)) {
      setSelected(selected?.filter((rId) => rId !== roomId));
      return;
    }
    const addedRooms = [...(selected ?? [])];
    addedRooms.push(roomId);
    setSelected(addedRooms);
  };

  const handleApplyChanges = () => {
    const selectedRooms = selected.map((rId) => getRoom(rId)).filter((room) => room !== undefined);
    applyChanges(selectedRooms).then(() => {
      if (alive()) {
        setSelected([]);
        requestClose();
      }
    });
  };

  const resetChanges = () => {
    setSelected([]);
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: true,
            onDeactivate: requestClose,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Modal size="300">
            <Box grow="Yes" direction="Column">
              <Header
                size="500"
                style={{
                  padding: config.space.S200,
                  paddingLeft: config.space.S400,
                }}
              >
                <Box grow="Yes">
                  <Text size="H4">Add Existing</Text>
                </Box>
                <Box shrink="No">
                  <IconButton size="300" radii="300" onClick={requestClose}>
                    <Icon src={Icons.Cross} />
                  </IconButton>
                </Box>
              </Header>
              <Box grow="Yes">
                <Scroll ref={scrollRef} size="300" hideTrack>
                  <Box
                    style={{ padding: config.space.S300, paddingRight: 0 }}
                    direction="Column"
                    gap="500"
                  >
                    <Box
                      direction="Column"
                      style={{ position: 'sticky', top: config.space.S300, zIndex: 1 }}
                    >
                      <Input
                        onChange={handleSearchChange}
                        before={<Icon size="200" src={Icons.Search} />}
                        placeholder="Search"
                        size="400"
                        variant="Background"
                        outlined
                      />
                    </Box>
                    {vItems.length === 0 && (
                      <Box
                        style={{ paddingTop: config.space.S700 }}
                        grow="Yes"
                        alignItems="Center"
                        justifyContent="Center"
                        direction="Column"
                        gap="100"
                      >
                        <Text size="H6" align="Center">
                          {searchResult ? 'No Match Found' : `No ${space ? 'Spaces' : 'Rooms'}`}
                        </Text>
                        <Text size="T200" align="Center">
                          {searchResult
                            ? `No match found for "${searchResult.query}".`
                            : `You do not have any ${space ? 'Spaces' : 'Rooms'} to display yet.`}
                        </Text>
                      </Box>
                    )}
                    <Box
                      style={{
                        position: 'relative',
                        height: virtualizer.getTotalSize(),
                      }}
                    >
                      {vItems.map((vItem) => {
                        const roomId = items[vItem.index];
                        const room = getRoom(roomId);
                        if (!room) return null;
                        const selectedItem = selected?.includes(roomId);
                        const dm = mDirects.has(room.roomId);

                        return (
                          <VirtualTile
                            virtualItem={vItem}
                            style={{ paddingBottom: config.space.S100 }}
                            ref={virtualizer.measureElement}
                            key={vItem.index}
                          >
                            <MenuItem
                              data-room-id={roomId}
                              onClick={handleRoomClick}
                              variant={selectedItem ? 'Success' : 'Surface'}
                              size="400"
                              radii="400"
                              disabled={applyingChanges}
                              aria-pressed={selectedItem}
                              before={
                                <Avatar size="200" radii={dm ? '400' : '300'}>
                                  {dm || room.isSpaceRoom() ? (
                                    <RoomAvatar
                                      roomId={room.roomId}
                                      src={
                                        dm
                                          ? getDirectRoomAvatarUrl(mx, room, 96, useAuthentication)
                                          : getRoomAvatarUrl(mx, room, 96, useAuthentication)
                                      }
                                      alt={room.name}
                                      renderFallback={() => (
                                        <Text as="span" size="H6">
                                          {nameInitials(room.name)}
                                        </Text>
                                      )}
                                    />
                                  ) : (
                                    <RoomIcon
                                      size="200"
                                      joinRule={room.getJoinRule()}
                                      roomType={room.getType()}
                                    />
                                  )}
                                </Avatar>
                              }
                              after={selectedItem && <Icon size="200" src={Icons.Check} />}
                            >
                              <Box grow="Yes">
                                <Text truncate size="T400">
                                  {queryHighlighRegex
                                    ? highlightText(queryHighlighRegex, [room.name])
                                    : room.name}
                                </Text>
                              </Box>
                            </MenuItem>
                          </VirtualTile>
                        );
                      })}
                    </Box>
                    {selected.length > 0 && (
                      <Menu
                        style={{
                          position: 'sticky',
                          padding: config.space.S200,
                          paddingLeft: config.space.S400,
                          bottom: config.space.S400,
                          left: config.space.S400,
                          right: 0,
                          zIndex: 1,
                        }}
                        variant="Success"
                      >
                        <Box alignItems="Center" gap="400">
                          <Box grow="Yes" direction="Column">
                            {applyState.status === AsyncStatus.Error ? (
                              <Text size="T200">
                                <b>Failed to apply changes! Please try again.</b>
                              </Text>
                            ) : (
                              <Text size="T200">
                                <b>Apply when ready. ({selected.length} Selected)</b>
                              </Text>
                            )}
                          </Box>
                          <Box shrink="No" gap="200">
                            <Button
                              size="300"
                              variant="Success"
                              fill="None"
                              radii="300"
                              disabled={applyingChanges}
                              onClick={resetChanges}
                            >
                              <Text size="B300">Reset</Text>
                            </Button>
                            <Button
                              size="300"
                              variant="Success"
                              radii="300"
                              disabled={applyingChanges}
                              before={
                                applyingChanges && (
                                  <Spinner variant="Success" fill="Solid" size="100" />
                                )
                              }
                              onClick={handleApplyChanges}
                            >
                              <Text size="B300">Apply Changes</Text>
                            </Button>
                          </Box>
                        </Box>
                      </Menu>
                    )}
                  </Box>
                </Scroll>
              </Box>
            </Box>
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
