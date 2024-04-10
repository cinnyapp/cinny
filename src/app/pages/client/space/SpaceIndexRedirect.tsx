import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { navToActivePathAtom } from '../../../state/navToActivePath';
import { useSpace } from '../../../hooks/useSpace';
import { getSpaceLobbyPath, joinPathComponent } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useMatrixClient } from '../../../hooks/useMatrixClient';

export function SpaceIndexRedirect() {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const space = useSpace();
  const navToActivePath = useAtomValue(navToActivePathAtom);

  useEffect(() => {
    const activePath = navToActivePath.get(space.roomId);
    if (activePath) {
      navigate(joinPathComponent(activePath), { replace: true });
    } else {
      navigate(getSpaceLobbyPath(getCanonicalAliasOrRoomId(mx, space.roomId)), { replace: true });
    }
  }, [navigate, mx, space.roomId, navToActivePath]);

  return null;
}
