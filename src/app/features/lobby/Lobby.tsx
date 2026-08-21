import React, { MouseEventHandler, useCallback, useMemo, useRef, useState } from 'react';
import { Box, Chip, Icon, IconButton, Icons, Line, Scroll, Spinner, Text, config } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import produce from 'immer';
import { AccountDataEvent, SpaceHierarchyRoomChunk } from 'neurone/lib/api/types';
import { putStateEvent } from 'neurone/lib/api/matrix/client/v3/rooms';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { ObjectReader } from 'neurone/lib/utils';
import { putAccountData } from 'neurone/lib/api/matrix/client/v3/user';
import { useSpace } from '../../hooks/useSpace';
import { Page, PageContent, PageContentCenter, PageHeroSection } from '../../components/page';
import {
  HierarchyItem,
  HierarchyItemSpace,
  useSpaceHierarchy,
} from '../../hooks/useSpaceHierarchy';
import { VirtualTile } from '../../components/virtualizer';
import { spaceRoomsAtom } from '../../state/spaceRooms';
import { MembersDrawer } from '../room/MembersDrawer';
import { useSetting } from '../../state/hooks/settings';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { LobbyHeader } from './LobbyHeader';
import { LobbyHero } from './LobbyHero';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { useElementSizeObserver } from '../../hooks/useElementSizeObserver';
import {
  IPowerLevels,
  PowerLevelsContextProvider,
  usePowerLevels,
  useRoomsPowerLevels,
  usePowerLevelsState,
} from '../../hooks/usePowerLevels';
import { makeLobbyCategoryId } from '../../state/closedLobbyCategories';
import { useCategoryHandler } from '../../hooks/useCategoryHandler';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { rateLimitedActions } from '../../utils/matrix';
import { getSpaceRoomPath } from '../../pages/pathUtils';
import { AllowCondition, StateEvent } from '../../../types/matrix/room';
import { CanDropCallback, useDnDMonitor } from './DnD';
import { ASCIILexicalTable, orderKeys } from '../../utils/ASCIILexicalTable';
import { useClosedLobbyCategoriesAtom } from '../../state/hooks/closedLobbyCategories';
import {
  makeCinnySpacesContent,
  sidebarItemWithout,
  useSidebarItems,
  InCinnySpacesContent,
} from '../../hooks/useSidebarItems';
import { useOrphanSpaces } from '../../state/hooks/roomList';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { SpaceHierarchy } from './SpaceHierarchy';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { getRoomPermissionsAPI } from '../../hooks/useRoomPermissions';
import { useClient } from '../../hooks/useClient';
import { RoomProvider } from '../../hooks/useRoom';
import { RoomMembersAPIProvider, useCreateRoomMembersAPI } from '../../hooks/useRoomMembers';
import { usePendingMemberLoader, usePendingMembers } from '../../hooks/usePendingMembers';
import { useAccountData } from '../../hooks/storage/useAccountData';
import { AccountDataType } from '../../../types/matrix/accountData';
import { useAllJoinedRoomsSet } from '../../hooks/useGetRoom';
import {
  PowerLevelTagsContextProvider,
  usePowerLevelTags,
  usePowerLevelTagsState,
} from '../../hooks/usePowerLevelTags';

const useCanDropLobbyItem = (
  spaceId: string,
  roomsPowerLevels: Map<string, IPowerLevels>
): CanDropCallback => {
  const ct = useClient();

  const canDropSpace: CanDropCallback = useCallback(
    (item, container) => {
      if (!('space' in container.item)) {
        // can not drop around rooms.
        // space can only be drop around other spaces
        return false;
      }

      const powerLevels = roomsPowerLevels.get(spaceId) ?? {};
      const creators = ct.roomToCreators.read.get(spaceId);
      const permissions = getRoomPermissionsAPI(creators, powerLevels);

      if (
        !ct.rooms.join.read.includes(spaceId) ||
        !permissions.stateEvent(StateEvent.SpaceChild, ct.session.userId)
      ) {
        return false;
      }

      return true;
    },
    [spaceId, roomsPowerLevels, ct]
  );

  const canDropRoom: CanDropCallback = useCallback(
    (item, container) => {
      const containerSpaceId =
        'space' in container.item ? container.item.roomId : container.item.parentId;

      const draggingOutsideSpace = item.parentId !== containerSpaceId;
      const restrictedItem = ct.roomToJoinRule.read.get(item.roomId) === 'restricted';

      // check and do not allow restricted room to be dragged outside
      // current space if can't change `m.room.join_rules` `content.allow`
      if (draggingOutsideSpace && restrictedItem) {
        const itemPowerLevels = roomsPowerLevels.get(item.roomId) ?? {};
        const itemCreators = ct.roomToCreators.read.get(item.roomId);
        const itemPermissions = getRoomPermissionsAPI(itemCreators, itemPowerLevels);

        const canChangeJoinRuleAllow = itemPermissions.stateEvent(
          StateEvent.RoomJoinRules,
          ct.session.userId
        );
        if (!canChangeJoinRuleAllow) {
          return false;
        }
      }

      const powerLevels = roomsPowerLevels.get(containerSpaceId) ?? {};
      const creators = ct.roomToCreators.read.get(containerSpaceId);
      const permissions = getRoomPermissionsAPI(creators, powerLevels);
      if (
        !ct.rooms.join.read.includes(containerSpaceId) ||
        !permissions.stateEvent(StateEvent.SpaceChild, ct.session.userId)
      ) {
        return false;
      }
      return true;
    },
    [ct, roomsPowerLevels]
  );

  const canDrop: CanDropCallback = useCallback(
    (item, container): boolean => {
      if (item.roomId === container.item.roomId || item.roomId === container.nextRoomId) {
        // can not drop before or after itself
        return false;
      }

      // if we are dragging a space
      if ('space' in item) {
        return canDropSpace(item, container);
      }

      return canDropRoom(item, container);
    },
    [canDropSpace, canDropRoom]
  );

  return canDrop;
};

export function Lobby() {
  const ct = useClient();
  const navigate = useNavigate();
  const spaceId = useSpace();
  const allJoinedRooms = useAllJoinedRoomsSet();

  const powerLevelStateResult = usePowerLevelsState(spaceId);
  const spacePowerLevels = usePowerLevels(powerLevelStateResult.value);
  const lex = useMemo(() => new ASCIILexicalTable(' '.charCodeAt(0), '~'.charCodeAt(0), 6), []);

  const powerLevelTagsStateResult = usePowerLevelTagsState(spaceId);
  const powerLevelTags = usePowerLevelTags(spacePowerLevels, powerLevelTagsStateResult.value);
  const membersAPI = useCreateRoomMembersAPI(spaceId);
  const membersPending = usePendingMembers(spaceId);
  usePendingMemberLoader(spaceId, membersPending);

  const scrollRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const [heroSectionHeight, setHeroSectionHeight] = useState<number>();
  const setSpaceRooms = useSetAtom(spaceRoomsAtom);
  const [isDrawer] = useSetting('isPeopleDrawer');
  const screenSize = useScreenSizeContext();
  const [onTop, setOnTop] = useState(true);
  const [closedCategories, setClosedCategories] = useAtom(useClosedLobbyCategoriesAtom());

  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanSpaces = useOrphanSpaces(ct, allRoomsAtom, roomToParents);
  const { value: cinnySpacesEvent } = useAccountData<AccountDataEvent<InCinnySpacesContent>>(
    AccountDataType.CinnySpaces
  );
  const sidebarItems = useSidebarItems(orphanSpaces, cinnySpacesEvent);

  const sidebarSpaces = useMemo(() => {
    const sideSpaces = sidebarItems.flatMap((item) => {
      if (typeof item === 'string') return item;
      return item.content;
    });

    return new Set(sideSpaces);
  }, [sidebarItems]);

  const [spacesItems, setSpacesItem] = useState<Map<string, SpaceHierarchyRoomChunk>>(
    () => new Map()
  );

  useElementSizeObserver(
    useCallback(() => heroSectionRef.current, []),
    useCallback((w, height) => setHeroSectionHeight(height), [])
  );

  const [draggingItem, setDraggingItem] = useState<HierarchyItem>();
  const hierarchy = useSpaceHierarchy(
    spaceId,
    useCallback(
      (childId) =>
        closedCategories.has(makeLobbyCategoryId(spaceId, childId)) ||
        (draggingItem ? 'space' in draggingItem : false),
      [closedCategories, spaceId, draggingItem]
    )
  );

  const virtualizer = useVirtualizer({
    count: hierarchy.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 1,
    overscan: 2,
    paddingStart: heroSectionHeight ?? 258,
  });
  const vItems = virtualizer.getVirtualItems();

  const roomsPowerLevels = useRoomsPowerLevels(
    useMemo(
      () =>
        hierarchy
          .flatMap((i): string[] => {
            const childRooms = Array.isArray(i.rooms) ? i.rooms.map((r) => r.roomId) : [];

            return [i.space.roomId, ...childRooms];
          })
          .filter((r) => ct.rooms.join.read.includes(r)),
      [hierarchy, ct]
    )
  );

  const canDrop: CanDropCallback = useCanDropLobbyItem(spaceId, roomsPowerLevels);

  const [reorderSpaceState, reorderSpace] = useAsyncCallback(
    useCallback(
      async (item: HierarchyItemSpace, containerItem: HierarchyItem) => {
        if (!item.parentId) return;

        const itemSpaces: HierarchyItemSpace[] = hierarchy
          .map((i) => i.space)
          .filter((i) => i.roomId !== item.roomId);

        const beforeIndex = itemSpaces.findIndex((i) => i.roomId === containerItem.roomId);
        const insertIndex = beforeIndex + 1;

        itemSpaces.splice(insertIndex, 0, {
          ...item,
          content: { ...item.content, order: undefined },
        });

        const currentOrders = itemSpaces.map((i) => {
          if (typeof i.content.order === 'string' && lex.has(i.content.order)) {
            return i.content.order;
          }
          return undefined;
        });

        const newOrders = orderKeys(lex, currentOrders);

        const reorders = newOrders
          ?.map((orderKey, index) => ({
            item: itemSpaces[index],
            orderKey,
          }))
          .filter((reorder, index) => {
            if (!reorder.item.parentId) return false;
            const parentPL = roomsPowerLevels.get(reorder.item.parentId);
            if (!parentPL) return false;

            const creators = ct.roomToCreators.read.get(reorder.item.parentId);
            const permissions = getRoomPermissionsAPI(creators, parentPL);
            const canEdit = permissions.stateEvent(StateEvent.SpaceChild, ct.session.userId);
            return canEdit && reorder.orderKey !== currentOrders[index];
          });

        if (reorders) {
          await rateLimitedActions(reorders, async (reorder) => {
            if (!reorder.item.parentId) return undefined;
            const resp = await ct.requestAuthJSON(
              putStateEvent({
                pathParams: {
                  roomId: reorder.item.parentId,
                  eventType: StateEvent.SpaceChild,
                  stateKey: reorder.item.roomId,
                },
                body: { ...reorder.item.content, order: reorder.orderKey },
              })
            );
            const [err] = await parseMatrixResp(resp);
            return err;
          });
        }
      },
      [ct, hierarchy, lex, roomsPowerLevels]
    )
  );
  const reorderingSpace = reorderSpaceState.status === AsyncStatus.Loading;

  const [reorderRoomState, reorderRoom] = useAsyncCallback(
    useCallback(
      async (item: HierarchyItem, containerItem: HierarchyItem) => {
        if (!item.parentId) {
          return;
        }
        const containerParentId: string =
          'space' in containerItem ? containerItem.roomId : containerItem.parentId;
        const itemContent = item.content;

        // remove from current space
        if (item.parentId !== containerParentId) {
          ct.requestAuthJSON(
            putStateEvent({
              pathParams: {
                roomId: item.parentId,
                eventType: StateEvent.SpaceChild,
                stateKey: item.roomId,
              },
              body: {},
            })
          );
        }

        if (
          ct.roomToJoinRule.read.get(item.roomId) === 'restricted' &&
          item.parentId !== containerParentId
        ) {
          // change join rule allow parameter when dragging
          // restricted room from one space to another
          const joinRuleContent = ct.state.join.joinRules.read.find(
            (e) => e.roomId === item.roomId && e.event.state_key === ''
          )?.event.content;

          if (joinRuleContent) {
            const allow =
              ObjectReader.array(joinRuleContent, 'allow')?.filter(
                (allowRule) => ObjectReader.string(allowRule, 'room_id') !== item.parentId
              ) ?? [];
            const allowCondition: AllowCondition = {
              type: 'm.room_membership',
              room_id: containerParentId,
            };
            allow.push(allowCondition);
            ct.requestAuthJSON(
              putStateEvent({
                pathParams: {
                  roomId: item.roomId,
                  eventType: StateEvent.RoomJoinRules,
                  stateKey: '',
                },
                body: {
                  ...joinRuleContent,
                  allow,
                },
              })
            );
          }
        }

        const itemRooms = Array.from(
          hierarchy?.find((i) => i.space.roomId === containerParentId)?.rooms ?? []
        ).filter((i) => i.roomId !== item.roomId);

        const beforeItem: HierarchyItem | undefined =
          'space' in containerItem ? undefined : containerItem;
        const beforeIndex = itemRooms.findIndex((i) => i.roomId === beforeItem?.roomId);
        const insertIndex = beforeIndex + 1;

        itemRooms.splice(insertIndex, 0, {
          ...item,
          parentId: containerParentId,
          content: { ...itemContent, order: undefined },
        });

        const currentOrders = itemRooms.map((i) => {
          if (typeof i.content.order === 'string' && lex.has(i.content.order)) {
            return i.content.order;
          }
          return undefined;
        });

        const newOrders = orderKeys(lex, currentOrders);

        const reorders = newOrders
          ?.map((orderKey, index) => ({
            item: itemRooms[index],
            orderKey,
          }))
          .filter((reorder, index) => reorder.item && reorder.orderKey !== currentOrders[index]);

        if (reorders) {
          await rateLimitedActions(reorders, async (reorder) => {
            const resp = await ct.requestAuthJSON(
              putStateEvent({
                pathParams: {
                  roomId: containerParentId,
                  eventType: StateEvent.SpaceChild,
                  stateKey: reorder.item.roomId,
                },
                body: { ...reorder.item.content, order: reorder.orderKey },
              })
            );
            const [err] = await parseMatrixResp(resp);
            return err;
          });
        }
      },
      [ct, hierarchy, lex]
    )
  );
  const reorderingRoom = reorderRoomState.status === AsyncStatus.Loading;
  const reordering = reorderingRoom || reorderingSpace;

  useDnDMonitor(
    scrollRef,
    setDraggingItem,
    useCallback(
      (item, container) => {
        if (!canDrop(item, container)) {
          return;
        }
        if ('space' in item) {
          reorderSpace(item, container.item);
        } else {
          reorderRoom(item, container.item);
        }
      },
      [reorderRoom, reorderSpace, canDrop]
    )
  );

  const handleSpacesFound = useCallback(
    (sItems: SpaceHierarchyRoomChunk[]) => {
      setSpaceRooms({ type: 'PUT', roomIds: sItems.map((i) => i.room_id) });
      setSpacesItem((current) => {
        const newItems = produce(current, (draft) => {
          sItems.forEach((item) => draft.set(item.room_id, item));
        });
        return current.size === newItems.size ? current : newItems;
      });
    },
    [setSpaceRooms]
  );

  const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) =>
    closedCategories.has(categoryId)
  );

  const handleOpenRoom: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const rId = evt.currentTarget.getAttribute('data-room-id');
    if (!rId) return;
    const spaceAlias = ct.roomToAlias.read.get(spaceId);
    const roomAlias = ct.roomToAlias.read.get(rId);

    navigate(getSpaceRoomPath(spaceAlias ?? spaceId, roomAlias ?? rId));
  };

  const togglePinToSidebar = useCallback(
    (rId: string) => {
      const newItems = sidebarItemWithout(sidebarItems, rId);
      if (!sidebarSpaces.has(rId)) {
        newItems.push(rId);
      }
      const newSpacesContent = makeCinnySpacesContent(newItems, cinnySpacesEvent);
      ct.requestAuthJSON(
        putAccountData({
          pathParams: {
            userId: ct.session.userId,
            type: AccountDataType.CinnySpaces,
          },
          body: newSpacesContent,
        })
      );
    },
    [ct, sidebarItems, sidebarSpaces, cinnySpacesEvent]
  );

  return (
    <RoomMembersAPIProvider value={membersAPI}>
      <PowerLevelsContextProvider value={spacePowerLevels}>
        <PowerLevelTagsContextProvider value={powerLevelTags}>
          <Box grow="Yes">
            <Page>
              <LobbyHeader showProfile={!onTop} powerLevels={roomsPowerLevels.get(spaceId) ?? {}} />
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
                          const item = hierarchy[vItem.index];
                          if (!item) return null;
                          const nextSpaceId = hierarchy[vItem.index + 1]?.space.roomId;

                          const categoryId = makeLobbyCategoryId(spaceId, item.space.roomId);

                          return (
                            <VirtualTile
                              virtualItem={vItem}
                              style={{
                                paddingTop: vItem.index === 0 ? 0 : config.space.S500,
                              }}
                              ref={virtualizer.measureElement}
                              key={vItem.index}
                            >
                              <SpaceHierarchy
                                spaceItem={item.space}
                                summary={spacesItems.get(item.space.roomId)}
                                roomItems={item.rooms}
                                allJoinedRooms={allJoinedRooms}
                                roomsPowerLevels={roomsPowerLevels}
                                categoryId={categoryId}
                                closed={
                                  closedCategories.has(categoryId) ||
                                  (draggingItem ? 'space' in draggingItem : false)
                                }
                                handleClose={handleCategoryClick}
                                draggingItem={draggingItem}
                                onDragging={setDraggingItem}
                                canDrop={canDrop}
                                disabledReorder={reordering}
                                nextSpaceId={nextSpaceId}
                                pinned={sidebarSpaces.has(item.space.roomId)}
                                togglePinToSidebar={togglePinToSidebar}
                                onSpacesFound={handleSpacesFound}
                                onOpenRoom={handleOpenRoom}
                              />
                            </VirtualTile>
                          );
                        })}
                      </div>
                      {reordering && (
                        <Box
                          style={{
                            position: 'absolute',
                            bottom: config.space.S400,
                            left: 0,
                            right: 0,
                            zIndex: 2,
                            pointerEvents: 'none',
                          }}
                          justifyContent="Center"
                        >
                          <Chip
                            variant="Secondary"
                            outlined
                            radii="Pill"
                            before={<Spinner variant="Secondary" fill="Soft" size="100" />}
                          >
                            <Text size="L400">Reordering</Text>
                          </Chip>
                        </Box>
                      )}
                    </PageContentCenter>
                  </PageContent>
                </Scroll>
              </Box>
            </Page>
            {screenSize === ScreenSize.Desktop && isDrawer && (
              <RoomProvider value={spaceId}>
                <Line variant="Background" direction="Vertical" size="300" />
                <MembersDrawer />
              </RoomProvider>
            )}
          </Box>
        </PowerLevelTagsContextProvider>
      </PowerLevelsContextProvider>
    </RoomMembersAPIProvider>
  );
}
