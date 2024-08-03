import { atom, useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';
import { roomToParentsAtom } from '../state/room/roomToParents';
import { MSpaceChildContent, StateEvent } from '../../types/matrix/room';
import { getAllParents, getStateEvents, isValidChild } from '../utils/room';
import { isRoomId } from '../utils/matrix';
import { SortFunc, byOrderKey, byTsOldToNew, factoryRoomIdByActivity } from '../utils/sort';
import { useStateEventCallback } from './useStateEventCallback';

export type HierarchyItem =
  | {
      roomId: string;
      content: MSpaceChildContent;
      ts: number;
      space: true;
      parentId?: string;
    }
  | {
      roomId: string;
      content: MSpaceChildContent;
      ts: number;
      space?: false;
      parentId: string;
    };

type GetRoomCallback = (roomId: string) => Room | undefined;

const hierarchyItemTs: SortFunc<HierarchyItem> = (a, b) => byTsOldToNew(a.ts, b.ts);
const hierarchyItemByOrder: SortFunc<HierarchyItem> = (a, b) =>
  byOrderKey(a.content.order, b.content.order);

const getHierarchySpaces = (
  rootSpaceId: string,
  getRoom: GetRoomCallback,
  spaceRooms: Set<string>
): HierarchyItem[] => {
  const rootSpaceItem: HierarchyItem = {
    roomId: rootSpaceId,
    content: { via: [] },
    ts: 0,
    space: true,
  };
  let spaceItems: HierarchyItem[] = [];

  const findAndCollectHierarchySpaces = (spaceItem: HierarchyItem) => {
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
        const childItem: HierarchyItem = {
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

const getSpaceHierarchy = (
  rootSpaceId: string,
  spaceRooms: Set<string>,
  getRoom: (roomId: string) => Room | undefined,
  closedCategory: (spaceId: string) => boolean
): HierarchyItem[] => {
  const spaceItems: HierarchyItem[] = getHierarchySpaces(rootSpaceId, getRoom, spaceRooms);

  const hierarchy: HierarchyItem[] = spaceItems.flatMap((spaceItem) => {
    const space = getRoom(spaceItem.roomId);
    if (!space || closedCategory(spaceItem.roomId)) {
      return [spaceItem];
    }
    const childEvents = getStateEvents(space, StateEvent.SpaceChild);
    const childItems: HierarchyItem[] = [];
    childEvents.forEach((childEvent) => {
      if (!isValidChild(childEvent)) return;
      const childId = childEvent.getStateKey();
      if (!childId || !isRoomId(childId)) return;
      if (getRoom(childId)?.isSpaceRoom() || spaceRooms.has(childId)) return;

      const childItem: HierarchyItem = {
        roomId: childId,
        content: childEvent.getContent<MSpaceChildContent>(),
        ts: childEvent.getTs(),
        parentId: spaceItem.roomId,
      };
      childItems.push(childItem);
    });
    return [spaceItem, ...childItems.sort(hierarchyItemTs).sort(hierarchyItemByOrder)];
  });

  return hierarchy;
};

export const useSpaceHierarchy = (
  spaceId: string,
  spaceRooms: Set<string>,
  getRoom: (roomId: string) => Room | undefined,
  closedCategory: (spaceId: string) => boolean
): HierarchyItem[] => {
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
  const spaceItems: HierarchyItem[] = getHierarchySpaces(rootSpaceId, getRoom, new Set());

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

    if (joinedRoomEvents.length === 0) return [];

    const childItems: HierarchyItem[] = [];
    joinedRoomEvents.forEach((childEvent) => {
      const childId = childEvent.getStateKey();
      if (!childId) return;

      if (excludeRoom(space.roomId, childId)) return;

      const childItem: HierarchyItem = {
        roomId: childId,
        content: childEvent.getContent<MSpaceChildContent>(),
        ts: childEvent.getTs(),
        parentId: spaceItem.roomId,
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
