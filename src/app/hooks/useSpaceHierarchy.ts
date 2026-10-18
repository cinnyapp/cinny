import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { SpaceHierarchyRoomChunk, StateEventWithoutRoomId } from 'neurone/lib/api/types';
import { QueryFunction, useInfiniteQuery } from '@tanstack/react-query';
import { getHierarchy, GetHierarchyOK } from 'neurone/lib/api/matrix/client/v1/rooms';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { SpaceChildContent } from '../../types/matrix/room';
import { isRoomId } from '../utils/matrix';
import { SortFunc, byOrderKey, byTsOldToNew, factoryRoomIdByActivity } from '../utils/sort';
import { ErrorCode } from '../cs-errorcode';
import { useObservableValue } from './useObservableValue';
import { useClient } from './useClient';
import { useAllJoinedRoomsSet } from './useAllJoinedRoomsSet';
import { spaceRoomsAtom } from '../state/spaceRooms';
import { rError } from '../../client/reader';
import { useRoomsLatestEvent } from './useRoomsLatestEvent';
import { RoomToNotifications } from '../state/room/roomToNotifications';
import { makeNavCategoryId } from '../state/closedNavCategories';
import { getRoomTotalNotifications } from '../state/hooks/roomNotifications';
import { useSetting } from '../state/hooks/settings';

export type HierarchyItemSpace = {
  roomId: string;
  content: SpaceChildContent;
  ts: number;
  space: true;
  parentId?: string;
};

export type HierarchyItemRoom = {
  roomId: string;
  content: SpaceChildContent;
  ts: number;
  parentId: string;
};

export type HierarchyItem = HierarchyItemSpace | HierarchyItemRoom;

const hierarchyItemTs: SortFunc<HierarchyItem> = (a, b) => byTsOldToNew(a.ts, b.ts);
const hierarchyItemByOrder: SortFunc<HierarchyItem> = (a, b) =>
  byOrderKey(a.content.order, b.content.order);

const getHierarchySpaces = (
  rootSpaceId: string,
  roomToChildEvents: Map<string, StateEventWithoutRoomId<SpaceChildContent>[]>,
  spaceRooms: Set<string>,
  spaceRoomsCache: Set<string>
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
    spaceItems.push(spaceItem);

    const childEvents = roomToChildEvents.get(spaceItem.roomId);

    childEvents?.forEach((childEvent) => {
      const childId = childEvent.state_key;
      if (!isRoomId(childId)) return;

      // because we can not find if a childId is space without joining
      // or requesting room summary, we will look it into spaceRooms local
      // cache which we maintain as we load summary in UI.
      if (spaceRooms.has(childId) || spaceRoomsCache.has(childId)) {
        const childItem: HierarchyItemSpace = {
          roomId: childId,
          content: childEvent.content,
          ts: childEvent.origin_server_ts,
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
  roomToChildEvents: Map<string, StateEventWithoutRoomId<SpaceChildContent>[]>,
  spaceRooms: Set<string>,
  spaceRoomsCache: Set<string>,
  closedCategory: (spaceId: string) => boolean
): SpaceHierarchy[] => {
  const spaceItems: HierarchyItemSpace[] = getHierarchySpaces(
    rootSpaceId,
    roomToChildEvents,
    spaceRooms,
    spaceRoomsCache
  );

  const hierarchy: SpaceHierarchy[] = spaceItems.map((spaceItem) => {
    const childEvents = roomToChildEvents.get(spaceItem.roomId);
    if (!spaceRooms.has(spaceItem.roomId) || closedCategory(spaceItem.roomId)) {
      return { space: spaceItem };
    }

    const childItems: HierarchyItemRoom[] = [];
    childEvents?.forEach((childEvent) => {
      const childId = childEvent.state_key;
      if (!childId || !isRoomId(childId)) return;
      if (spaceRooms.has(childId) || spaceRoomsCache.has(childId)) return;

      const childItem: HierarchyItemRoom = {
        roomId: childId,
        content: childEvent.content,
        ts: childEvent.origin_server_ts,
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
  closedCategory: (spaceId: string) => boolean
): SpaceHierarchy[] => {
  const ct = useClient();
  const roomToChildEvents = useObservableValue(ct.roomToChildEvents);
  const spaceRooms = useObservableValue(ct.spaceRooms);
  const spaceRoomsCache = useAtomValue(spaceRoomsAtom);

  const hierarchy = useMemo(
    () =>
      getSpaceHierarchy(spaceId, roomToChildEvents, spaceRooms, spaceRoomsCache, closedCategory),
    [spaceId, roomToChildEvents, spaceRooms, spaceRoomsCache, closedCategory]
  );

  return hierarchy;
};

const getSpaceJoinedHierarchy = (
  rootSpaceId: string,
  joinedRooms: Set<string>,
  roomToChildEvents: Map<string, StateEventWithoutRoomId<SpaceChildContent>[]>,
  spaceRooms: Set<string>
) => {
  const spaceItems: HierarchyItemSpace[] = getHierarchySpaces(
    rootSpaceId,
    roomToChildEvents,
    spaceRooms,
    new Set()
  );

  const hierarchy = spaceItems.flatMap((spaceItem) => {
    const childEvents = roomToChildEvents.get(spaceItem.roomId);

    const childItems: HierarchyItemRoom[] = [];

    childEvents?.forEach((childEvent) => {
      const childId = childEvent.state_key;
      if (!childId || !isRoomId(childId)) return;
      if (!joinedRooms.has(childId) || spaceRooms.has(childId)) return;

      const childItem: HierarchyItemRoom = {
        roomId: childId,
        content: childEvent.content,
        ts: childEvent.origin_server_ts,
        parentId: spaceItem.roomId,
      };
      childItems.push(childItem);
    });
    if (childItems.length === 0) return [];

    return {
      spaceItem,
      childItems,
    };
  });

  return hierarchy;
};

export const useSpaceJoinedHierarchy = (spaceId: string) => {
  const ct = useClient();
  const roomToChildEvents = useObservableValue(ct.roomToChildEvents);
  const allJoinedRooms = useAllJoinedRoomsSet();
  const spaceRooms = useObservableValue(ct.spaceRooms);

  const hierarchy = useMemo(
    () => getSpaceJoinedHierarchy(spaceId, allJoinedRooms, roomToChildEvents, spaceRooms),
    [spaceId, allJoinedRooms, roomToChildEvents, spaceRooms]
  );

  return hierarchy;
};

export const useJoinedHierarchyItems = (
  spaceId: string,
  hierarchy: ReturnType<typeof useSpaceJoinedHierarchy>,
  rooms: string[],
  roomToNotifications: RoomToNotifications,
  unreadRooms: Set<string>,
  closedCategories: Set<string>,
  selectedRoomId: string | undefined
) => {
  const roomToLatestEvent = useRoomsLatestEvent(rooms);
  const [sortByActivity] = useSetting('roomListByActivity');

  const prepareItems = useCallback(
    (sId: string, items: HierarchyItem[]) => {
      if (closedCategories.has(makeNavCategoryId(spaceId, sId))) {
        return items
          .filter((item) => {
            if (item.roomId === selectedRoomId) return true;
            const notification = roomToNotifications.get(item.roomId);
            if (!notification) return false;
            const total = getRoomTotalNotifications(notification);
            return total.count > 0 || unreadRooms.has(item.roomId);
          })
          .sort((h1, h2) =>
            factoryRoomIdByActivity((rId) => roomToLatestEvent.get(rId)?.origin_server_ts)(
              h1.roomId,
              h2.roomId
            )
          );
      }

      if (sortByActivity) {
        items.sort((h1, h2) =>
          factoryRoomIdByActivity((rId) => roomToLatestEvent.get(rId)?.origin_server_ts)(
            h1.roomId,
            h2.roomId
          )
        );
        return items;
      }

      items.sort(hierarchyItemTs).sort(hierarchyItemByOrder);

      return items;
    },
    [
      roomToLatestEvent,
      closedCategories,
      spaceId,
      roomToNotifications,
      unreadRooms,
      selectedRoomId,
      sortByActivity,
    ]
  );

  const hierarchyItems: HierarchyItem[] = useMemo(
    () =>
      hierarchy.flatMap((item) => [
        item.spaceItem,
        ...prepareItems(item.spaceItem.roomId, item.childItems),
      ]),
    [hierarchy, prepareItems]
  );

  return hierarchyItems;
};

// we will paginate until 5000 items
const PER_PAGE_COUNT = 100;
const MAX_AUTO_PAGE_COUNT = 50;
export type FetchSpaceHierarchyLevelData = {
  fetching: boolean;
  error: unknown;
  rooms: Map<string, SpaceHierarchyRoomChunk>;
};
export const useFetchSpaceHierarchyLevel = (
  roomId: string,
  enable: boolean
): FetchSpaceHierarchyLevelData => {
  const ct = useClient();
  const pageNoRef = useRef(0);

  const fetchLevel: QueryFunction<GetHierarchyOK, string[], string | undefined> = useCallback(
    async ({ pageParam }) => {
      const response = await ct.requestAuthJSON(
        getHierarchy({
          pathParams: { roomId },
          searchParams: {
            from: pageParam,
            max_depth: 1,
            limit: PER_PAGE_COUNT,
            suggested_only: false,
          },
        })
      );
      const [err, result] = await parseMatrixResp<GetHierarchyOK>(response);
      if (err) {
        throw err.data;
      }

      return result;
    },
    [roomId, ct]
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
      if (rError.errcode(error) === ErrorCode.M_LIMIT_EXCEEDED && rError.retryAfterMs(error)) {
        return rError.retryAfterMs(error) ?? 500 * failureCount;
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

  const rooms: Map<string, SpaceHierarchyRoomChunk> = useMemo(() => {
    const roomsMap: Map<string, SpaceHierarchyRoomChunk> = new Map();
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
