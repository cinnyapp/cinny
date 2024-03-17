import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { getHomeRoomPath, getSpacePath, getSpaceRoomPath } from '../../pathUtils';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getOrphanParents } from '../../../utils/room';
import { roomToParentsAtom } from '../../../state/room/roomToParents';

export const useRoomNavigate = () => {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const roomToParents = useAtomValue(roomToParentsAtom);

  const navigateSpace = useCallback(
    (roomId: string) => {
      const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, roomId);
      navigate(getSpacePath(roomIdOrAlias));
    },
    [mx, navigate]
  );

  const navigateRoom = useCallback(
    (roomId: string) => {
      const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, roomId);

      const orphanParents = getOrphanParents(roomToParents, roomId);
      if (orphanParents.length > 0) {
        const pSpaceIdOrAlias = getCanonicalAliasOrRoomId(mx, orphanParents[0]);
        navigate(getSpaceRoomPath(pSpaceIdOrAlias, roomIdOrAlias));
        return;
      }

      navigate(getHomeRoomPath(roomIdOrAlias));
    },
    [mx, navigate, roomToParents]
  );

  return {
    navigateSpace,
    navigateRoom,
  };
};
