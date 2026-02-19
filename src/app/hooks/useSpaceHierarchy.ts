import { atom, useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MatrixError, MatrixEvent, Room } from 'matrix-js-sdk';
import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces';
import { QueryFunction, useInfiniteQuery } from '@tanstack/react-query';
import { useMatrixClient } from './useMatrixClient';
import { roomToParentsAtom } from '../state/room/roomToParents';
import { MSpaceChildContent, StateEvent } from '../../types/matrix/room';
import { getAllParents, getStateEvents, isValidChild } from '../utils/room';
import { makeLobbyCategoryId } from '../state/closedLobbyCategories';
import { isRoomId } from '../utils/matrix';
import { SortFunc, byOrderKey, byTsOldToNew, factoryRoomIdByActivity } from '../utils/sort';
import { useStateEventCallback } from './useStateEventCallback';
import { ErrorCode } from '../cs-errorcode';

export type HierarchyItemSpace = {
  roomId: string;
  content: MSpaceChildContent;
  ts: number;
  space: true;
  parentId?: string;
  depth: number;
};

export type HierarchyItemRoom = {
  roomId: string;
  content: MSpaceChildContent;
  ts: number;
  parentId: string;
  depth: number;
};

export type HierarchyItem = HierarchyItemSpace | HierarchyItemRoom;

type GetRoomCallback = (roomId: string) => Room | undefined;

const hierarchyItemTs: SortFunc<HierarchyItem> = (a, b) => byTsOldToNew(a.ts, b.ts);
const hierarchyItemByOrder: SortFunc<HierarchyItem> = (a, b) =>
  byOrderKey(a.content.order, b.content.order);

const childEventTs: SortFunc<MatrixEvent> = (a, b) => byTsOldToNew(a.getTs(), b.getTs());
const childEventByOrder: SortFunc<MatrixEvent> = (a, b) =>
  byOrderKey(a.getContent<MSpaceChildContent>().order, b.getContent<MSpaceChildContent>().order);

const getHierarchySpaces = (
  rootSpaceId: string,
  getRoom: GetRoomCallback,
  excludeRoom: (parentId: string, roomId: string) => boolean,
  spaceRooms: Set<string>
): HierarchyItemSpace[] => {
  const rootSpaceItem: HierarchyItemSpace = {
    roomId: rootSpaceId,
    content: { via: [] },
    ts: 0,
    space: true,
    depth: 0,
  };
  const spaceItems: HierarchyItemSpace[] = [];

  const findAndCollectHierarchySpaces = (
    spaceItem: HierarchyItemSpace,
    parentSpaceId: string,
    visited: Set<string> = new Set()
  ) => {
    const spaceItemId = makeLobbyCategoryId(parentSpaceId, spaceItem.roomId);

    // Prevent infinite recursion
    if (visited.has(spaceItemId)) return;
    visited.add(spaceItemId);

    const space = getRoom(spaceItem.roomId);
    spaceItems.push(spaceItem);

    if (!space) return;
    const childEvents = getStateEvents(space, StateEvent.SpaceChild)
      .filter((childEvent) => {
        if (!isValidChild(childEvent)) return false;
        const childId = childEvent.getStateKey();
        if (!childId || !isRoomId(childId)) return false;
        if (excludeRoom(spaceItem.roomId, childId)) return false;

        // because we can not find if a childId is space without joining
        // or requesting room summary, we will look it into spaceRooms local
        // cache which we maintain as we load summary in UI.
        return getRoom(childId)?.isSpaceRoom() || spaceRooms.has(childId);
      })
      .sort(childEventTs)
      .sort(childEventByOrder);

    childEvents.forEach((childEvent) => {
      const childId = childEvent.getStateKey();
      if (!childId || !isRoomId(childId)) return;

      const childItem: HierarchyItemSpace = {
        roomId: childId,
        content: childEvent.getContent<MSpaceChildContent>(),
        ts: childEvent.getTs(),
        space: true,
        parentId: spaceItem.roomId,
        depth: spaceItem.depth + 1,
      };
      findAndCollectHierarchySpaces(childItem, spaceItem.roomId, visited);
    });
  };
  findAndCollectHierarchySpaces(rootSpaceItem, rootSpaceId);

  return spaceItems;
};

export type SpaceHierarchy = {
  space: HierarchyItemSpace;
  rooms?: HierarchyItemRoom[];
};
const getSpaceHierarchy = (
  rootSpaceId: string,
  spaceRooms: Set<string>,
  getRoom: (roomId: string) => Room | undefined,
  closedCategory: (spaceId: string) => boolean
): SpaceHierarchy[] => {
  const spaceItems: HierarchyItemSpace[] = getHierarchySpaces(
    rootSpaceId,
    getRoom,
    () => false,
    spaceRooms
  );

  const hierarchy: SpaceHierarchy[] = spaceItems.map((spaceItem) => {
    const space = getRoom(spaceItem.roomId);
    if (!space || closedCategory(spaceItem.roomId)) {
      return {
        space: spaceItem,
      };
    }
    const childEvents = getStateEvents(space, StateEvent.SpaceChild);
    const childItems: HierarchyItemRoom[] = [];
    childEvents.forEach((childEvent) => {
      if (!isValidChild(childEvent)) return;
      const childId = childEvent.getStateKey();
      if (!childId || !isRoomId(childId)) return;
      if (getRoom(childId)?.isSpaceRoom() || spaceRooms.has(childId)) return;

      const childItem: HierarchyItemRoom = {
        roomId: childId,
        content: childEvent.getContent<MSpaceChildContent>(),
        ts: childEvent.getTs(),
        parentId: spaceItem.roomId,
        depth: spaceItem.depth,
      };
      childItems.push(childItem);
    });

    return {
      space: spaceItem,
      rooms: childItems.sort(hierarchyItemTs).sort(hierarchyItemByOrder),
    };
  });

  return hierarchy;
};

export const useSpaceHierarchy = (
  spaceId: string,
  spaceRooms: Set<string>,
  getRoom: (roomId: string) => Room | undefined,
  closedCategory: (spaceId: string) => boolean
): SpaceHierarchy[] => {
  const mx = useMatrixClient();
  const roomToParents = useAtomValue(roomToParentsAtom);

  const [hierarchyAtom] = useState(() =>
    atom(getSpaceHierarchy(spaceId, spaceRooms, getRoom, closedCategory))
  );
  const [hierarchy, setHierarchy] = useAtom(hierarchyAtom);

  useEffect(() => {
    setHierarchy(getSpaceHierarchy(spaceId, spaceRooms, getRoom, closedCategory));
  }, [mx, spaceId, spaceRooms, setHierarchy, getRoom, closedCategory]);

  useStateEventCallback(
    mx,
    useCallback(
      (mEvent) => {
        if (mEvent.getType() !== StateEvent.SpaceChild) return;
        const eventRoomId = mEvent.getRoomId();
        if (!eventRoomId) return;

        if (spaceId === eventRoomId || getAllParents(roomToParents, eventRoomId).has(spaceId)) {
          setHierarchy(getSpaceHierarchy(spaceId, spaceRooms, getRoom, closedCategory));
        }
      },
      [spaceId, roomToParents, setHierarchy, spaceRooms, getRoom, closedCategory]
    )
  );

  return hierarchy;
};

const getSpaceJoinedHierarchy = (
  rootSpaceId: string,
  getRoom: GetRoomCallback,
  excludeRoom: (parentId: string, roomId: string) => boolean,
  sortRoomItems: (parentId: string, items: HierarchyItem[]) => HierarchyItem[]
): HierarchyItem[] => {
  const spaceItems: HierarchyItemSpace[] = getHierarchySpaces(
    rootSpaceId,
    getRoom,
    excludeRoom,
    new Set()
  );

  /**
   * Recursively checks if the given space or any of its descendants contain non-space rooms.
   *
   * @param spaceId - The space ID to check.
   * @param visited - Set used to prevent recursion errors.
   * @returns True if the space or any descendant contains non-space rooms.
   */
  const getContainsRoom = (spaceId: string, visited: Set<string> = new Set()) => {
    // Prevent infinite recursion
    if (visited.has(spaceId)) return false;
    visited.add(spaceId);

    const space = getRoom(spaceId);
    if (!space) return false;

    const childEvents = getStateEvents(space, StateEvent.SpaceChild);

    return childEvents.some((childEvent): boolean => {
      if (!isValidChild(childEvent)) return false;
      const childId = childEvent.getStateKey();
      if (!childId || !isRoomId(childId)) return false;
      const room = getRoom(childId);
      if (!room) return false;

      if (!room.isSpaceRoom()) return true;
      return getContainsRoom(childId, visited);
    });
  };

  const hierarchy: HierarchyItem[] = spaceItems.flatMap((spaceItem) => {
    const space = getRoom(spaceItem.roomId);
    if (!space) {
      return [];
    }
    const joinedRoomEvents = getStateEvents(space, StateEvent.SpaceChild).filter((childEvent) => {
      if (!isValidChild(childEvent)) return false;
      const childId = childEvent.getStateKey();
      if (!childId || !isRoomId(childId)) return false;
      const room = getRoom(childId);
      if (!room || room.isSpaceRoom()) return false;

      return true;
    });

    if (!getContainsRoom(spaceItem.roomId)) return [];

    const childItems: HierarchyItemRoom[] = [];
    joinedRoomEvents.forEach((childEvent) => {
      const childId = childEvent.getStateKey();
      if (!childId) return;

      if (excludeRoom(space.roomId, childId)) return;

      const childItem: HierarchyItemRoom = {
        roomId: childId,
        content: childEvent.getContent<MSpaceChildContent>(),
        ts: childEvent.getTs(),
        parentId: spaceItem.roomId,
        depth: spaceItem.depth,
      };
      childItems.push(childItem);
    });
    return [spaceItem, ...sortRoomItems(spaceItem.roomId, childItems)];
  });

  return hierarchy;
};

export const useSpaceJoinedHierarchy = (
  spaceId: string,
  getRoom: GetRoomCallback,
  excludeRoom: (parentId: string, roomId: string) => boolean,
  sortByActivity: (spaceId: string) => boolean
): HierarchyItem[] => {
  const mx = useMatrixClient();
  const roomToParents = useAtomValue(roomToParentsAtom);

  const sortRoomItems = useCallback(
    (sId: string, items: HierarchyItem[]) => {
      if (sortByActivity(sId)) {
        items.sort((a, b) => factoryRoomIdByActivity(mx)(a.roomId, b.roomId));
        return items;
      }
      items.sort(hierarchyItemTs).sort(hierarchyItemByOrder);
      return items;
    },
    [mx, sortByActivity]
  );

  const [hierarchyAtom] = useState(() =>
    atom(getSpaceJoinedHierarchy(spaceId, getRoom, excludeRoom, sortRoomItems))
  );
  const [hierarchy, setHierarchy] = useAtom(hierarchyAtom);

  useEffect(() => {
    setHierarchy(getSpaceJoinedHierarchy(spaceId, getRoom, excludeRoom, sortRoomItems));
  }, [mx, spaceId, setHierarchy, getRoom, excludeRoom, sortRoomItems]);

  useStateEventCallback(
    mx,
    useCallback(
      (mEvent) => {
        if (mEvent.getType() !== StateEvent.SpaceChild) return;
        const eventRoomId = mEvent.getRoomId();
        if (!eventRoomId) return;

        if (spaceId === eventRoomId || getAllParents(roomToParents, eventRoomId).has(spaceId)) {
          setHierarchy(getSpaceJoinedHierarchy(spaceId, getRoom, excludeRoom, sortRoomItems));
        }
      },
      [spaceId, roomToParents, setHierarchy, getRoom, excludeRoom, sortRoomItems]
    )
  );

  return hierarchy;
};

// we will paginate until 5000 items
const PER_PAGE_COUNT = 100;
const MAX_AUTO_PAGE_COUNT = 50;
export type FetchSpaceHierarchyLevelData = {
  fetching: boolean;
  error: Error | null;
  rooms: Map<string, IHierarchyRoom>;
};
export const useFetchSpaceHierarchyLevel = (
  roomId: string,
  enable: boolean
): FetchSpaceHierarchyLevelData => {
  const mx = useMatrixClient();
  const pageNoRef = useRef(0);

  const fetchLevel: QueryFunction<
    Awaited<ReturnType<typeof mx.getRoomHierarchy>>,
    string[],
    string | undefined
  > = useCallback(
    ({ pageParam }) => mx.getRoomHierarchy(roomId, PER_PAGE_COUNT, 1, false, pageParam),
    [roomId, mx]
  );

  const queryResponse = useInfiniteQuery({
    refetchOnMount: enable,
    queryKey: [roomId, 'hierarchy_level'],
    initialPageParam: undefined,
    queryFn: fetchLevel,
    getNextPageParam: (result) => {
      if (result.next_batch) return result.next_batch;
      return undefined;
    },
    retry: 5,
    retryDelay: (failureCount, error) => {
      if (error instanceof MatrixError && error.errcode === ErrorCode.M_LIMIT_EXCEEDED) {
        const { retry_after_ms: delay } = error.data;
        if (typeof delay === 'number') {
          return delay;
        }
      }

      return 500 * failureCount;
    },
  });

  const { data, isLoading, isFetchingNextPage, error, fetchNextPage, hasNextPage } = queryResponse;

  useEffect(() => {
    if (
      hasNextPage &&
      pageNoRef.current <= MAX_AUTO_PAGE_COUNT &&
      !error &&
      data &&
      data.pages.length > 0
    ) {
      pageNoRef.current += 1;
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, data, error]);

  const rooms: Map<string, IHierarchyRoom> = useMemo(() => {
    const roomsMap: Map<string, IHierarchyRoom> = new Map();
    if (!data) return roomsMap;

    const rms = data.pages.flatMap((result) => result.rooms);
    rms.forEach((r) => {
      roomsMap.set(r.room_id, r);
    });

    return roomsMap;
  }, [data]);

  const fetching = isLoading || isFetchingNextPage;

  return {
    fetching,
    error,
    rooms,
  };
};
