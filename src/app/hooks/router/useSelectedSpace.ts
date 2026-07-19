import { useMatch, useParams } from 'react-router-dom';
import { isRoomAlias } from '../../utils/matrix';
import { getSpaceLobbyPath, getSpaceSearchPath } from '../../pages/pathUtils';
import { useClient } from '../useClient';
import { useObservableValue } from '../useObservableValue';

export const useSelectedSpace = (): string | undefined => {
  const ct = useClient();
  const { spaceIdOrAlias } = useParams();

  const roomToAlias = useObservableValue(ct.roomToAlias);

  if (!spaceIdOrAlias) return undefined;

  const spaceId = isRoomAlias(spaceIdOrAlias)
    ? ct.rooms.join.read.find(
        (roomId) =>
          roomToAlias.get(roomId) === spaceIdOrAlias && !ct.roomToReplacement.read.has(roomId)
      )
    : spaceIdOrAlias;

  return spaceId;
};

export const useSpaceLobbySelected = (spaceIdOrAlias: string): boolean => {
  const match = useMatch({
    path: decodeURIComponent(getSpaceLobbyPath(spaceIdOrAlias)),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useSpaceSearchSelected = (spaceIdOrAlias: string): boolean => {
  const match = useMatch({
    path: decodeURIComponent(getSpaceSearchPath(spaceIdOrAlias)),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};
