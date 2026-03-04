import React, { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, Icon, IconButton, Icons, Line, Scroll, Spinner, Text, config } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtom, useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { JoinRule, RestrictedAllowType, Room } from 'matrix-js-sdk';
import { RoomJoinRulesEventContent } from 'matrix-js-sdk/lib/types';
import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces';
import produce from 'immer';
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
import { settingsAtom } from '../../state/settings';
import { LobbyHeader } from './LobbyHeader';
import { LobbyHero } from './LobbyHero';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { useElementSizeObserver } from '../../hooks/useElementSizeObserver';
import {
  IPowerLevels,
  PowerLevelsContextProvider,
  usePowerLevels,
  useRoomsPowerLevels,
} from '../../hooks/usePowerLevels';
import { mDirectAtom } from '../../state/mDirectList';
import { makeLobbyCategoryId, getLobbyCategoryIdParts } from '../../state/closedLobbyCategories';
import { useCategoryHandler } from '../../hooks/useCategoryHandler';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { getCanonicalAliasOrRoomId, rateLimitedActions } from '../../utils/matrix';
import { getSpaceRoomPath } from '../../pages/pathUtils';
import { StateEvent } from '../../../types/matrix/room';
import { CanDropCallback, useDnDMonitor } from './DnD';
import { ASCIILexicalTable, orderKeys } from '../../utils/ASCIILexicalTable';
import { getStateEvent } from '../../utils/room';
import { useClosedLobbyCategoriesAtom } from '../../state/hooks/closedLobbyCategories';
import {
  makeCinnySpacesContent,
  sidebarItemWithout,
  useSidebarItems,
} from '../../hooks/useSidebarItems';
import { useOrphanSpaces } from '../../state/hooks/roomList';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { AccountDataEvent } from '../../../types/matrix/accountData';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { SpaceHierarchy } from './SpaceHierarchy';
import { useGetRoom } from '../../hooks/useGetRoom';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { getRoomPermissionsAPI } from '../../hooks/useRoomPermissions';
import { getRoomCreatorsForRoomId } from '../../hooks/useRoomCreators';

const useCanDropLobbyItem = (
  space: Room,
  roomsPowerLevels: Map<string, IPowerLevels>,
  getRoom: (roomId: string) => Room | undefined
): CanDropCallback => {
  const mx = useMatrixClient();

  const canDropSpace: CanDropCallback = useCallback(
    (item, container) => {
      if (!('space' in container.item)) {
        // can not drop around rooms.
        // space can only be drop around other spaces
        return false;
      }

      const containerSpaceId = space.roomId;

      // only allow to be dropped in parent space
      if (item.parentId !== container.item.roomId && item.parentId !== container.item.parentId) {
        return false;
      }

      const powerLevels = roomsPowerLevels.get(containerSpaceId) ?? {};
      const creators = getRoomCreatorsForRoomId(mx, containerSpaceId);
      const permissions = getRoomPermissionsAPI(creators, powerLevels);

      if (
        getRoom(containerSpaceId) === undefined ||
        !permissions.stateEvent(StateEvent.SpaceChild, mx.getSafeUserId())
      ) {
        return false;
      }

      return true;
    },
    [space, roomsPowerLevels, getRoom, mx]
  );

  const canDropRoom: CanDropCallback = useCallback(
    (item, container) => {
      const containerSpaceId =
        'space' in container.item ? container.item.roomId : container.item.parentId;

      const draggingOutsideSpace = item.parentId !== containerSpaceId;
      const restrictedItem = mx.getRoom(item.roomId)?.getJoinRule() === JoinRule.Restricted;

      // check and do not allow restricted room to be dragged outside
      // current space if can't change `m.room.join_rules` `content.allow`
      if (draggingOutsideSpace && restrictedItem) {
        const itemPowerLevels = roomsPowerLevels.get(item.roomId) ?? {};
        const itemCreators = getRoomCreatorsForRoomId(mx, item.roomId);
        const itemPermissions = getRoomPermissionsAPI(itemCreators, itemPowerLevels);

        const canChangeJoinRuleAllow = itemPermissions.stateEvent(
          StateEvent.RoomJoinRules,
          mx.getSafeUserId()
        );
        if (!canChangeJoinRuleAllow) {
          return false;
        }
      }

      const powerLevels = roomsPowerLevels.get(containerSpaceId) ?? {};
      const creators = getRoomCreatorsForRoomId(mx, containerSpaceId);
      const permissions = getRoomPermissionsAPI(creators, powerLevels);
      if (
        getRoom(containerSpaceId) === undefined ||
        !permissions.stateEvent(StateEvent.SpaceChild, mx.getSafeUserId())
      ) {
        return false;
      }
      return true;
    },
    [mx, getRoom, roomsPowerLevels]
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
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const allRooms = useAtomValue(allRoomsAtom);
  const allJoinedRooms = useMemo(() => new Set(allRooms), [allRooms]);
  const space = useSpace();
  const spacePowerLevels = usePowerLevels(space);
  const lex = useMemo(() => new ASCIILexicalTable(' '.charCodeAt(0), '~'.charCodeAt(0), 6), []);
  const members = useRoomMembers(mx, space.roomId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const [heroSectionHeight, setHeroSectionHeight] = useState<number>();
  const [spaceRooms, setSpaceRooms] = useAtom(spaceRoomsAtom);
  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const screenSize = useScreenSizeContext();
  const [onTop, setOnTop] = useState(true);
  const [closedCategories, setClosedCategories] = useAtom(useClosedLobbyCategoriesAtom());
  const roomToParents = useAtomValue(roomToParentsAtom);
  const [sidebarItems] = useSidebarItems(
    useOrphanSpaces(mx, allRoomsAtom, useAtomValue(roomToParentsAtom))
  );
  const sidebarSpaces = useMemo(() => {
    const sideSpaces = sidebarItems.flatMap((item) => {
      if (typeof item === 'string') return item;
      return item.content;
    });

    return new Set(sideSpaces);
  }, [sidebarItems]);

  const [spacesItems, setSpacesItem] = useState<Map<string, IHierarchyRoom>>(() => new Map());

  useElementSizeObserver(
    useCallback(() => heroSectionRef.current, []),
    useCallback((w, height) => setHeroSectionHeight(height), [])
  );

  const getRoom = useGetRoom(allJoinedRooms);

  const closedCategoriesCache = useRef(new Map());
  useEffect(() => {
    closedCategoriesCache.current.clear();
  }, [closedCategories, roomToParents, getRoom]);

  /**
   * Recursively checks if a given parentId (or all its ancestors) is in a closed category.
   *
   * @param spaceId - The root space ID.
   * @param parentId - The parent space ID to start the check from.
   * @param previousId - The last ID checked, only used to ignore root collapse state.
   * @param visited - Set used to prevent recursion errors.
   * @returns True if parentId or all ancestors is in a closed category.
   */
  const getInClosedCategories = useCallback(
    (
      spaceId: string,
      parentId: string,
      previousId?: string,
      visited: Set<string> = new Set()
    ): boolean => {
      // Ignore root space being collapsed if in a subspace,
      // this is due to many spaces dumping all rooms in the top-level space.
      if (parentId === spaceId && previousId) {
        if (spaceRooms.has(previousId) || getRoom(previousId)?.isSpaceRoom()) {
          return false;
        }
      }

      const categoryId = makeLobbyCategoryId(spaceId, parentId);

      // Prevent infinite recursion
      if (visited.has(categoryId)) return false;
      visited.add(categoryId);

      if (closedCategoriesCache.current.has(categoryId)) {
        return closedCategoriesCache.current.get(categoryId);
      }

      if (closedCategories.has(categoryId)) {
        closedCategoriesCache.current.set(categoryId, true);
        return true;
      }

      const parentParentIds = roomToParents.get(parentId);
      if (!parentParentIds || parentParentIds.size === 0) {
        closedCategoriesCache.current.set(categoryId, false);
        return false;
      }

      // As a subspace can be in multiple spaces,
      // only return true if all parent spaces are closed.
      const allClosed = !Array.from(parentParentIds).some(
        (id) => !getInClosedCategories(spaceId, id, parentId, visited)
      );
      visited.delete(categoryId);
      closedCategoriesCache.current.set(categoryId, allClosed);
      return allClosed;
    },
    [closedCategories, getRoom, roomToParents, spaceRooms]
  );

  /**
   * Determines whether all parent categories are collapsed.
   *
   * @param spaceId - The root space ID.
   * @param roomId - The room ID to start the check from.
   * @returns True if every parent category is collapsed; false otherwise.
   */
  const getAllAncestorsCollapsed = (spaceId: string, roomId: string): boolean => {
    const parentIds = roomToParents.get(roomId);

    if (!parentIds || parentIds.size === 0) {
      return false;
    }

    return !Array.from(parentIds).some((id) => !getInClosedCategories(spaceId, id, roomId));
  };

  const [draggingItem, setDraggingItem] = useState<HierarchyItem>();
  const hierarchy = useSpaceHierarchy(
    space.roomId,
    spaceRooms,
    getRoom,
    useCallback(
      (childId) =>
        getInClosedCategories(space.roomId, childId) ||
        (draggingItem ? 'space' in draggingItem : false),
      [draggingItem, getInClosedCategories, space.roomId]
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
          .flatMap((i) => {
            const childRooms = Array.isArray(i.rooms) ? i.rooms.map((r) => getRoom(r.roomId)) : [];

            return [getRoom(i.space.roomId), ...childRooms];
          })
          .filter((r) => !!r) as Room[],
      [hierarchy, getRoom]
    )
  );

  const canDrop: CanDropCallback = useCanDropLobbyItem(space, roomsPowerLevels, getRoom);

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

            const creators = getRoomCreatorsForRoomId(mx, reorder.item.parentId);
            const permissions = getRoomPermissionsAPI(creators, parentPL);
            const canEdit = permissions.stateEvent(StateEvent.SpaceChild, mx.getSafeUserId());
            return canEdit && reorder.orderKey !== currentOrders[index];
          });

        if (reorders) {
          await rateLimitedActions(reorders, async (reorder) => {
            if (!reorder.item.parentId) return;
            await mx.sendStateEvent(
              reorder.item.parentId,
              StateEvent.SpaceChild as any,
              { ...reorder.item.content, order: reorder.orderKey },
              reorder.item.roomId
            );
          });
        }
      },
      [mx, hierarchy, lex, roomsPowerLevels]
    )
  );
  const reorderingSpace = reorderSpaceState.status === AsyncStatus.Loading;

  const [reorderRoomState, reorderRoom] = useAsyncCallback(
    useCallback(
      async (item: HierarchyItem, containerItem: HierarchyItem) => {
        const itemRoom = mx.getRoom(item.roomId);
        if (!item.parentId) {
          return;
        }
        const containerParentId: string =
          'space' in containerItem ? containerItem.roomId : containerItem.parentId;
        const itemContent = item.content;

        // remove from current space
        if (item.parentId !== containerParentId) {
          await mx.sendStateEvent(item.parentId, StateEvent.SpaceChild as any, {}, item.roomId);
        }

        if (
          itemRoom &&
          itemRoom.getJoinRule() === JoinRule.Restricted &&
          item.parentId !== containerParentId
        ) {
          // change join rule allow parameter when dragging
          // restricted room from one space to another
          const joinRuleContent = getStateEvent(
            itemRoom,
            StateEvent.RoomJoinRules
          )?.getContent<RoomJoinRulesEventContent>();

          if (joinRuleContent) {
            const allow =
              joinRuleContent.allow?.filter((allowRule) => allowRule.room_id !== item.parentId) ??
              [];
            allow.push({ type: RestrictedAllowType.RoomMembership, room_id: containerParentId });
            await mx.sendStateEvent(itemRoom.roomId, StateEvent.RoomJoinRules as any, {
              ...joinRuleContent,
              allow,
            });
          }
        }

        const itemSpaces = Array.from(
          hierarchy?.find((i) => i.space.roomId === containerParentId)?.rooms ?? []
        );

        const beforeItem: HierarchyItem | undefined =
          'space' in containerItem ? undefined : containerItem;
        const beforeIndex = itemSpaces.findIndex((i) => i.roomId === beforeItem?.roomId);
        const insertIndex = beforeIndex + 1;

        itemSpaces.splice(insertIndex, 0, {
          ...item,
          parentId: containerParentId,
          content: { ...itemContent, order: undefined },
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
          .filter((reorder, index) => reorder.item && reorder.orderKey !== currentOrders[index]);

        if (reorders) {
          await rateLimitedActions(reorders, async (reorder) => {
            await mx.sendStateEvent(
              containerParentId,
              StateEvent.SpaceChild as any,
              { ...reorder.item.content, order: reorder.orderKey },
              reorder.item.roomId
            );
          });
        }
      },
      [mx, hierarchy, lex]
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
    (sItems: IHierarchyRoom[]) => {
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

  const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) => {
    const collapsed = closedCategories.has(categoryId);
    const [spaceId, roomId] = getLobbyCategoryIdParts(categoryId);

    // Prevent collapsing if all parents are collapsed
    const toggleable = !getAllAncestorsCollapsed(spaceId, roomId);

    if (toggleable) {
      return collapsed;
    }
    return !collapsed;
  });

  const handleOpenRoom: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const rId = evt.currentTarget.getAttribute('data-room-id');
    if (!rId) return;
    const pSpaceIdOrAlias = getCanonicalAliasOrRoomId(mx, space.roomId);
    navigate(getSpaceRoomPath(pSpaceIdOrAlias, getCanonicalAliasOrRoomId(mx, rId)));
  };

  const togglePinToSidebar = useCallback(
    (rId: string) => {
      const newItems = sidebarItemWithout(sidebarItems, rId);
      if (!sidebarSpaces.has(rId)) {
        newItems.push(rId);
      }
      const newSpacesContent = makeCinnySpacesContent(mx, newItems);
      mx.setAccountData(AccountDataEvent.CinnySpaces as any, newSpacesContent as any);
    },
    [mx, sidebarItems, sidebarSpaces]
  );

  return (
    <PowerLevelsContextProvider value={spacePowerLevels}>
      <Box grow="Yes">
        <Page>
          <LobbyHeader
            showProfile={!onTop}
            powerLevels={roomsPowerLevels.get(space.roomId) ?? {}}
          />
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
                      const categoryId = makeLobbyCategoryId(space.roomId, item.space.roomId);
                      const inClosedCategory = getInClosedCategories(
                        space.roomId,
                        item.space.roomId
                      );

                      const paddingLeft = `calc((${item.space.depth} - 1) * ${config.space.S200})`;

                      return (
                        <VirtualTile
                          virtualItem={vItem}
                          style={{
                            paddingTop: vItem.index === 0 ? 0 : config.space.S500,
                            paddingLeft,
                          }}
                          ref={virtualizer.measureElement}
                          key={vItem.index}
                        >
                          <SpaceHierarchy
                            spaceItem={item.space}
                            summary={spacesItems.get(item.space.roomId)}
                            roomItems={item.rooms}
                            allJoinedRooms={allJoinedRooms}
                            mDirects={mDirects}
                            roomsPowerLevels={roomsPowerLevels}
                            categoryId={categoryId}
                            closed={
                              inClosedCategory || (draggingItem ? 'space' in draggingItem : false)
                            }
                            handleClose={handleCategoryClick}
                            draggingItem={draggingItem}
                            onDragging={setDraggingItem}
                            canDrop={canDrop}
                            disabledReorder={reordering}
                            nextSpaceId={nextSpaceId}
                            getRoom={getRoom}
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
          <>
            <Line variant="Background" direction="Vertical" size="300" />
            <MembersDrawer room={space} members={members} />
          </>
        )}
      </Box>
    </PowerLevelsContextProvider>
  );
}
