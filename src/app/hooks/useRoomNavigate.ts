import { useCallback } from 'react';
import { NavigateOptions, useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import {
  getDirectRoomPath,
  getHomeRoomPath,
  getSpacePath,
  getSpaceRoomPath,
} from '../pages/pathUtils';
import { getOrphanParents, guessPerfectParent } from '../utils/room';
import { roomToParentsAtom } from '../state/room/roomToParents';
import { mDirectAtom } from '../state/mDirectList';
import { useSelectedSpace } from './router/useSelectedSpace';
import { useSetting } from '../state/hooks/settings';
import { useClient } from './useClient';
import { getJoinRoomStateId } from '../../client/storage/collections';
import { StateEventType } from '../../types/matrix/room';

export const useRoomNavigate = () => {
  const ct = useClient();
  const navigate = useNavigate();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const mDirects = useAtomValue(mDirectAtom);
  const spaceSelectedId = useSelectedSpace();
  const [developerTools] = useSetting('developerTools');

  const navigateSpace = useCallback(
    (roomId: string) => {
      const roomIdOrAlias = ct.roomToAlias.read.get(roomId) ?? roomId;
      navigate(getSpacePath(roomIdOrAlias));
    },
    [ct, navigate]
  );

  const navigateRoom = useCallback(
    async (roomId: string, eventId?: string, opts?: NavigateOptions) => {
      const roomIdOrAlias = ct.roomToAlias.read.get(roomId) ?? roomId;
      const openSpaceTimeline =
        developerTools && ct.spaceRooms.read.has(roomId) && spaceSelectedId === roomId;

      const orphanParents = openSpaceTimeline ? [roomId] : getOrphanParents(roomToParents, roomId);
      if (orphanParents.length > 0) {
        let parentSpace: string;
        if (spaceSelectedId && orphanParents.includes(spaceSelectedId)) {
          parentSpace = spaceSelectedId;
        } else {
          const powerEventIds = [roomId]
            .concat(orphanParents)
            .map((rId) => getJoinRoomStateId(rId, StateEventType.RoomPowerLevels, ''));
          const powerLevelEventObjs = await ct.storage.joinRoomState.read.getMultiple(
            powerEventIds
          );
          parentSpace =
            guessPerfectParent(
              roomId,
              orphanParents,
              (rId) => ct.roomToCreators.read.get(rId),
              (rId) => powerLevelEventObjs.find((obj) => obj?.roomId === rId)?.event.content
            ) ?? orphanParents[0];
        }

        const pSpaceIdOrAlias = ct.roomToAlias.read.get(parentSpace) ?? parentSpace;

        navigate(
          getSpaceRoomPath(pSpaceIdOrAlias, openSpaceTimeline ? roomId : roomIdOrAlias, eventId),
          opts
        );
        return;
      }

      if (mDirects.has(roomId)) {
        navigate(getDirectRoomPath(roomIdOrAlias, eventId), opts);
        return;
      }

      navigate(getHomeRoomPath(roomIdOrAlias, eventId), opts);
    },
    [ct, navigate, spaceSelectedId, roomToParents, mDirects, developerTools]
  );

  return {
    navigateSpace,
    navigateRoom,
  };
};
