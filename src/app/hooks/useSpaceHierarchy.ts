import { atom, useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MatrixError, Room } from 'matrix-js-sdk';
import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces';
import { QueryFunction, useInfiniteQuery } from '@tanstack/react-query';
import { useMatrixClient } from './useMatrixClient';
import { roomToParentsAtom } from '../state/room/roomToParents';
import { MSpaceChildContent, StateEvent } from '../../types/matrix/room';
import { getAllParents, getStateEvents, isValidChild } from '../utils/room';
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
};

export type HierarchyItemRoom = {
  roomId: string;
  content: MSpaceChildContent;
  ts: number;
  parentId: string;
};

export type HierarchyItem = HierarchyItemSpace | HierarchyItemRoom;

type GetRoomCallback = (roomId: string) => Room | undefined;

const hierarchyItemTs: SortFunc<HierarchyItem> = (a, b) => byTsOldToNew(a.ts, b.ts);
const hierarchyItemByOrder: SortFunc<HierarchyItem> = (a, b) =>
  byOrderKey(a.content.order, b.content.order);

const getHierarchySpaces = (
  rootSpaceId: string,
  getRoom: GetRoomCallback,
  spaceRooms: Set<string>
): HierarchyItemSpace[] => {
  const rootSpaceItem: HierarchyItemSpace = {
    roomId: rootSpaceId,
    content: { via: [] },
    ts: 0,
    space: true,
  };
  let spaceItems: HierarchyItemSpace[] = [];

  const findAndCollectHierarchySpaces = (spaceItem: HierarchyItemSpace) => {
    if (spaceItems.find((item) => item.roomId === spaceItem.roomId)) return;
    const space = getRoom(spaceItem.roomId);
    spaceItems.push(spaceItem);

    if (!space) return;
    const childEvents = getStateEvents(space, StateEvent.SpaceChild);

    childEvents.forEach((childEvent) => {
      if (!isValidChild(childEvent)) return;
      const childId = childEvent.getStateKey();
      if (!childId || !isRoomId(childId)) return;

      // because we can not find if a childId is space without joining
      // or requesting room summary, we will look it into spaceRooms local
      // cache which we maintain as we load summary in UI.
      if (getRoom(childId)?.isSpaceRoom() || spaceRooms.has(childId)) {
        const childItem: HierarchyItemSpace = {
          roomId: childId,
          content: childEvent.getContent<MSpaceChildContent>(),
          ts: childEvent.getTs(),
          space: true,
          parentId: spaceItem.roomId,
        };
        findAndCollectHierarchySpaces(childItem);
      }
    });
  };
  findAndCollectHierarchySpaces(rootSpaceItem);

  spaceItems = [
    rootSpaceItem,
    ...spaceItems
      .filter((item) => item.roomId !== rootSpaceId)
      .sort(hierarchyItemTs)
      .sort(hierarchyItemByOrder),
  ];

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
  const spaceItems: HierarchyItemSpace[] = getHierarchySpaces(rootSpaceId, getRoom, spaceRooms);

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

/** One space of a joined hierarchy together with its joined (non-space) children. */
type JoinedHierarchyLevel = {
  space: HierarchyItemSpace;
  rooms: HierarchyItemRoom[];
};

/**
 * Read the space tree out of room state.
 *
 * This is the expensive half: it walks every `m.space.child` state event of every
 * space in the tree (a bridge space such as "WhatsApp" has thousands of them) and
 * allocates one item per child. It therefore only depends on the tree itself — not
 * on which rooms are unread or selected — so it can be kept out of the render path
 * of ordinary activity.
 */
const getSpaceJoinedHierarchyLevels = (
  rootSpaceId: string,
  getRoom: GetRoomCallback
): JoinedHierarchyLevel[] => {
  const spaceItems: HierarchyItemSpace[] = getHierarchySpaces(rootSpaceId, getRoom, new Set());

  return spaceItems.flatMap<JoinedHierarchyLevel>((spaceItem) => {
    const space = getRoom(spaceItem.roomId);
    if (!space) {
      return [];
    }

    const childItems: HierarchyItemRoom[] = [];
    getStateEvents(space, StateEvent.SpaceChild).forEach((childEvent) => {
      if (!isValidChild(childEvent)) return;
      const childId = childEvent.getStateKey();
      if (!childId || !isRoomId(childId)) return;
      const room = getRoom(childId);
      if (!room || room.isSpaceRoom()) return;

      childItems.push({
        roomId: childId,
        content: childEvent.getContent<MSpaceChildContent>(),
        ts: childEvent.getTs(),
        parentId: spaceItem.roomId,
      });
    });

    if (childItems.length === 0) return [];

    return [{ space: spaceItem, rooms: childItems }];
  });
};

/**
 * The cheap half: hide the rooms the caller wants hidden and order what is left.
 * Filtering never changes the relative order of the remaining rooms, so sorting
 * after the filter gives the same result as sorting before it.
 */
const flattenSpaceJoinedHierarchy = (
  levels: JoinedHierarchyLevel[],
  excludeRoom: (parentId: string, roomId: string) => boolean,
  sortRoomItems: (parentId: string, items: HierarchyItem[]) => HierarchyItem[]
): HierarchyItem[] =>
  levels.flatMap<HierarchyItem>(({ space, rooms }) => [
    space,
    ...sortRoomItems(
      space.roomId,
      rooms.filter((item) => !excludeRoom(space.roomId, item.roomId))
    ),
  ]);

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

  const [levelsAtom] = useState(() => atom(getSpaceJoinedHierarchyLevels(spaceId, getRoom)));
  const [levels, setLevels] = useAtom(levelsAtom);

  useEffect(() => {
    setLevels(getSpaceJoinedHierarchyLevels(spaceId, getRoom));
  }, [mx, spaceId, setLevels, getRoom]);

  useStateEventCallback(
    mx,
    useCallback(
      (mEvent) => {
        if (mEvent.getType() !== StateEvent.SpaceChild) return;
        const eventRoomId = mEvent.getRoomId();
        if (!eventRoomId) return;

        if (spaceId === eventRoomId || getAllParents(roomToParents, eventRoomId).has(spaceId)) {
          setLevels(getSpaceJoinedHierarchyLevels(spaceId, getRoom));
        }
      },
      [spaceId, roomToParents, setLevels, getRoom]
    )
  );

  return useMemo(
    () => flattenSpaceJoinedHierarchy(levels, excludeRoom, sortRoomItems),
    [levels, excludeRoom, sortRoomItems]
  );
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
