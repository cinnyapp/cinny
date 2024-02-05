import { useParams } from 'react-router-dom';
import { getCanonicalAliasRoomId, isRoomAlias } from '../utils/matrix';
import { useMatrixClient } from './useMatrixClient';

export const useSelectedSpace = (): string | undefined => {
  const mx = useMatrixClient();

  const { spaceIdOrAlias } = useParams();
  const spaceId =
    spaceIdOrAlias && isRoomAlias(spaceIdOrAlias)
      ? getCanonicalAliasRoomId(mx, spaceIdOrAlias)
      : spaceIdOrAlias;

  return spaceId;
};
