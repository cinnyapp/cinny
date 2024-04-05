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

export const useSpaceHierarchy = (spaceId: string): string[] => {
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

          return [parentId].concat(
            get(childRoomsAtom).sort(factoryRoomIdByAtoZ(mx)),
            get(childDirectsAtom).sort(factoryRoomIdByActivity(mx))
          );
        })
      ),
    [mx, spaceId, childSpaces, factoryChildRoomSelector, factoryChildDirectSelector]
  );

  return useAtomValue(hierarchyAtom);
};
