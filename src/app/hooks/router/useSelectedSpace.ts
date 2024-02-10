import { useMatch, useParams } from 'react-router-dom';
import { getCanonicalAliasRoomId, isRoomAlias } from '../../utils/matrix';
import { useMatrixClient } from '../useMatrixClient';
import { getSpaceLobbyPath, getSpaceSearchPath } from '../../pages/pathUtils';

export const useSelectedSpace = (): string | undefined => {
  const mx = useMatrixClient();

  const { spaceIdOrAlias } = useParams();

  const spaceId =
    spaceIdOrAlias && isRoomAlias(spaceIdOrAlias)
      ? getCanonicalAliasRoomId(mx, spaceIdOrAlias)
      : spaceIdOrAlias;

  return spaceId;
};

export const useSpaceLobbySelected = (spaceIdOrAlias: string): boolean => {
  const match = useMatch({
    path: getSpaceLobbyPath(spaceIdOrAlias),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useSpaceSearchSelected = (spaceIdOrAlias: string): boolean => {
  const match = useMatch({
    path: getSpaceSearchPath(spaceIdOrAlias),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};
