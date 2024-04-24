import { useMemo } from 'react';
import { atom, useAtomValue } from 'jotai';
import {
  selectedRoomsAtom,
  useChildDirectScopeFactory,
  useChildRoomScopeFactory,
  useRecursiveChildSpaceScopeFactory,
  useSpaceChildren,
} from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { factoryRoomIdByActivity, factoryRoomIdByAtoZ } from '../../../utils/sort';

export const useSpaceJoinedHierarchy = (
  spaceId: string,
  closedCategory: (spaceId: string, directCategory: boolean) => boolean,
  showWhenClosed: (roomId: string) => boolean
): string[] => {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const childSpaces = useSpaceChildren(
    allRoomsAtom,
    spaceId,
    useRecursiveChildSpaceScopeFactory(mx, roomToParents)
  );

  const factoryChildRoomSelector = useChildRoomScopeFactory(mx, mDirects, roomToParents);
  const factoryChildDirectSelector = useChildDirectScopeFactory(mx, mDirects, roomToParents);

  const hierarchyAtom = useMemo(
    () =>
      atom((get) =>
        [spaceId].concat(childSpaces.sort(factoryRoomIdByAtoZ(mx))).flatMap((parentId) => {
          const childRoomsAtom = selectedRoomsAtom(
            allRoomsAtom,
            factoryChildRoomSelector(parentId)
          );
          const childDirectsAtom = selectedRoomsAtom(
            allRoomsAtom,
            factoryChildDirectSelector(parentId)
          );

          const rooms = get(childRoomsAtom);
          const directs = get(childDirectsAtom);
          let items: string[] = [];
          if (rooms.length > 0) {
            items = items.concat(
              [parentId],
              closedCategory(parentId, false)
                ? rooms.filter(showWhenClosed).sort(factoryRoomIdByActivity(mx))
                : rooms.sort(factoryRoomIdByAtoZ(mx))
            );
          }
          if (directs.length > 0) {
            items = items.concat(
              [parentId],
              closedCategory(parentId, true)
                ? directs.filter(showWhenClosed).sort(factoryRoomIdByActivity(mx))
                : directs.sort(factoryRoomIdByActivity(mx))
            );
          }
          return items;
        })
      ),
    [
      mx,
      spaceId,
      childSpaces,
      factoryChildRoomSelector,
      factoryChildDirectSelector,
      closedCategory,
      showWhenClosed,
    ]
  );

  return useAtomValue(hierarchyAtom);
};
