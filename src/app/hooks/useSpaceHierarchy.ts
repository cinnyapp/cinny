import { atom, useAtom, useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { Room, RoomStateEvent, RoomStateEventHandlerMap } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';
import { roomToParentsAtom } from '../state/room/roomToParents';
import { MSpaceChildContent, StateEvent } from '../../types/matrix/room';
import { getAllParents, getStateEvents, isValidChild } from '../utils/room';
import { isRoomId } from '../utils/matrix';
import { SortFunc, byOrderKey, byTsOldToNew } from '../utils/sort';

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

const hierarchyItemTs: SortFunc<HierarchyItem> = (a, b) => byTsOldToNew(a.ts, b.ts);
const hierarchyItemByOrder: SortFunc<HierarchyItem> = (a, b) =>
  byOrderKey(a.content.order, b.content.order);

const getFlattenSpaceHierarchy = (
  rootSpaceId: string,
  spaceRooms: Set<string>,
  getRoom: (roomId: string) => Room | undefined,
  closedCategory: (spaceId: string) => boolean
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
    atom(getFlattenSpaceHierarchy(spaceId, spaceRooms, getRoom, closedCategory))
  );
  const [hierarchy, setHierarchy] = useAtom(hierarchyAtom);

  useEffect(() => {
    setHierarchy(getFlattenSpaceHierarchy(spaceId, spaceRooms, getRoom, closedCategory));
  }, [mx, spaceId, spaceRooms, setHierarchy, getRoom, closedCategory]);

  useEffect(() => {
    const handleStateEvent: RoomStateEventHandlerMap[RoomStateEvent.Events] = (mEvent) => {
      if (mEvent.getType() !== StateEvent.SpaceChild) return;
      const eventRoomId = mEvent.getRoomId();
      if (!eventRoomId) return;

      if (spaceId === eventRoomId || getAllParents(roomToParents, eventRoomId).has(spaceId)) {
        setHierarchy(getFlattenSpaceHierarchy(spaceId, spaceRooms, getRoom, closedCategory));
      }
    };

    mx.on(RoomStateEvent.Events, handleStateEvent);
    return () => {
      mx.removeListener(RoomStateEvent.Events, handleStateEvent);
    };
  }, [mx, spaceId, roomToParents, setHierarchy, spaceRooms, getRoom, closedCategory]);

  return hierarchy;
};
