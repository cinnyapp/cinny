import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WelcomePage } from '../WelcomePage';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getDirectCreateSearchParams } from '../../pathSearchParam';
import { getDirectPath, getDirectRoomPath } from '../../pathUtils';
import { getDMRoomFor } from '../../../utils/matrix';
import { openInviteUser } from '../../../../client/action/navigation';
import { useDirectRooms } from './useDirectRooms';

export function DirectCreate() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId } = getDirectCreateSearchParams(searchParams);
  const directs = useDirectRooms();

  useEffect(() => {
    if (userId) {
      const room = getDMRoomFor(mx, userId);
      const { roomId } = room ?? {};
      if (roomId && directs.includes(roomId)) {
        navigate(getDirectRoomPath(roomId), { replace: true });
      } else {
        openInviteUser(undefined, userId);
      }
    } else {
      navigate(getDirectPath(), { replace: true });
    }
  }, [mx, navigate, directs, userId]);

  return <WelcomePage />;
}
