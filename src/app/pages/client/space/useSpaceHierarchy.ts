import { atom, useAtom, useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { MatrixClient, RoomStateEvent, RoomStateEventHandlerMap } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { MSpaceChildContent, StateEvent } from '../../../../types/matrix/room';
import { getAllParents, getStateEvents, isValidChild } from '../../../utils/room';
import { isRoomId } from '../../../utils/matrix';
import { factoryRoomIdByAtoZ } from '../../../utils/sort';

export type HierarchyItem = {
  roomId: string;
  content: MSpaceChildContent;
  space?: boolean;
  parentId?: string;
};
const getFlattenSpaceHierarchy = (
  mx: MatrixClient,
  rootSpaceId: string,
  spaceRooms: Set<string>
): HierarchyItem[] => {
  const rootSpaceItem: HierarchyItem = {
    roomId: rootSpaceId,
    content: { via: [] },
    space: true,
  };
  let spaceItems: HierarchyItem[] = [];

  const findAndCollectHierarchySpaces = (spaceItem: HierarchyItem) => {
    if (spaceItems.find((item) => item.roomId === spaceItem.roomId)) return;
    const space = mx.getRoom(spaceItem.roomId);
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
      if (mx.getRoom(childId)?.isSpaceRoom() || spaceRooms.has(childId)) {
        const childItem: HierarchyItem = {
          roomId: childId,
          content: childEvent.getContent<MSpaceChildContent>(),
          space: true,
          parentId: spaceItem.roomId,
        };
        findAndCollectHierarchySpaces(childItem);
      }
    });
  };
  findAndCollectHierarchySpaces(rootSpaceItem);

  // TODO: sort by order + added ts
  spaceItems = [
    rootSpaceItem,
    ...spaceItems
      .filter((item) => item.roomId !== rootSpaceId)
      .sort((a, b) => factoryRoomIdByAtoZ(mx)(a.roomId, b.roomId)),
  ];

  const hierarchy: HierarchyItem[] = spaceItems.flatMap((spaceItem) => {
    const space = mx.getRoom(spaceItem.roomId);
    if (!space) {
      return [spaceItem];
    }
    const childEvents = getStateEvents(space, StateEvent.SpaceChild);
    const childItems: HierarchyItem[] = [];
    childEvents.forEach((childEvent) => {
      if (!isValidChild(childEvent)) return;
      const childId = childEvent.getStateKey();
      if (!childId || !isRoomId(childId)) return;
      if (mx.getRoom(childId)?.isSpaceRoom() || spaceRooms.has(childId)) return;

      const childItem: HierarchyItem = {
        roomId: childId,
        content: childEvent.getContent<MSpaceChildContent>(),
        parentId: spaceItem.roomId,
      };
      childItems.push(childItem);
    });
    return [spaceItem, ...childItems.sort((a, b) => factoryRoomIdByAtoZ(mx)(a.roomId, b.roomId))];
  });

  return hierarchy;
};

export const useSpaceHierarchy = (spaceId: string, spaceRooms: Set<string>): HierarchyItem[] => {
  const mx = useMatrixClient();
  const roomToParents = useAtomValue(roomToParentsAtom);

  const [hierarchyAtom] = useState(() => atom(getFlattenSpaceHierarchy(mx, spaceId, spaceRooms)));
  const [hierarchy, setHierarchy] = useAtom(hierarchyAtom);

  useEffect(() => {
    setHierarchy(getFlattenSpaceHierarchy(mx, spaceId, spaceRooms));
  }, [mx, spaceId, spaceRooms, setHierarchy]);

  useEffect(() => {
    const handleStateEvent: RoomStateEventHandlerMap[RoomStateEvent.Events] = (mEvent) => {
      if (mEvent.getType() !== StateEvent.SpaceChild) return;
      const eventRoomId = mEvent.getRoomId();
      if (!eventRoomId) return;
      const allParents = getAllParents(roomToParents, eventRoomId);

      if (allParents.has(spaceId)) {
        setHierarchy(getFlattenSpaceHierarchy(mx, spaceId, spaceRooms));
      }
    };

    mx.on(RoomStateEvent.Events, handleStateEvent);
    return () => {
      mx.removeListener(RoomStateEvent.Events, handleStateEvent);
    };
  }, [mx, spaceId, roomToParents, setHierarchy, spaceRooms]);

  return hierarchy;
};
