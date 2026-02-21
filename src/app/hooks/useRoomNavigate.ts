import { useCallback, useTransition } from 'react';
import { NavigateOptions, useNavigate } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { getCanonicalAliasOrRoomId } from '../utils/matrix';
import {
  getDirectRoomPath,
  getHomeRoomPath,
  getSpacePath,
  getSpaceRoomPath,
} from '../pages/pathUtils';
import { useMatrixClient } from './useMatrixClient';
import { getOrphanParents, guessPerfectParent } from '../utils/room';
import { roomToParentsAtom } from '../state/room/roomToParents';
import { mDirectAtom } from '../state/mDirectList';
import { useSelectedSpace } from './router/useSelectedSpace';
import { settingsAtom } from '../state/settings';
import { useSetting } from '../state/hooks/settings';

export const useRoomNavigate = () => {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const mDirects = useAtomValue(mDirectAtom);
  const spaceSelectedId = useSelectedSpace();
  const [developerTools] = useSetting(settingsAtom, 'developerTools');
  const [isPending, startTransition] = useTransition();

  const navigateSpace = useCallback(
    (roomId: string) => {
      startTransition(() => {
        const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, roomId);
        navigate(getSpacePath(roomIdOrAlias));
      });
    },
    [mx, navigate, startTransition] // Add new dependencies
  );

  const navigateRoom = useCallback(
    (roomId: string, eventId?: string, opts?: NavigateOptions) => {
      startTransition(() => {
        const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, roomId);
        const openSpaceTimeline = developerTools && spaceSelectedId === roomId;

        const orphanParents = openSpaceTimeline
          ? [roomId]
          : getOrphanParents(roomToParents, roomId);
        if (orphanParents.length > 0) {
          const pSpaceIdOrAlias = getCanonicalAliasOrRoomId(
            mx,
            spaceSelectedId && orphanParents.includes(spaceSelectedId)
              ? spaceSelectedId
              : orphanParents[0]
          );

          if (openSpaceTimeline) {
            navigate(getSpaceRoomPath(pSpaceIdOrAlias, roomId, eventId), opts);
            return;
          }

          navigate(getSpaceRoomPath(pSpaceIdOrAlias, roomIdOrAlias, eventId), opts);
          return;
        }

        if (mDirects.has(roomId)) {
          navigate(getDirectRoomPath(roomIdOrAlias, eventId), opts);
          return;
        }

        navigate(getHomeRoomPath(roomIdOrAlias, eventId), opts);
      });
    },
    [mx, navigate, spaceSelectedId, roomToParents, mDirects, developerTools, startTransition]
  );

  return {
    navigateSpace,
    navigateRoom,
    isPending,
  };
};
