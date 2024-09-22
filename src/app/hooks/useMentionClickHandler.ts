import { ReactEventHandler, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomNavigate } from './useRoomNavigate';
import { useMatrixClient } from './useMatrixClient';
import { isRoomId, isUserId } from '../utils/matrix';
import { openProfileViewer } from '../../client/action/navigation';
import { getHomeRoomPath, withSearchParam } from '../pages/pathUtils';
import { _RoomSearchParams } from '../pages/paths';

export const useMentionClickHandler = (roomId: string): ReactEventHandler<HTMLElement> => {
  const mx = useMatrixClient();
  const { navigateRoom, navigateSpace } = useRoomNavigate();
  const navigate = useNavigate();

  const handleClick: ReactEventHandler<HTMLElement> = useCallback(
    (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      const target = evt.currentTarget;
      const mentionId = target.getAttribute('data-mention-id');
      if (typeof mentionId !== 'string') return;

      if (isUserId(mentionId)) {
        openProfileViewer(mentionId, roomId);
        return;
      }

      const eventId = target.getAttribute('data-mention-event-id') || undefined;
      if (isRoomId(mentionId) && mx.getRoom(mentionId)) {
        if (mx.getRoom(mentionId)?.isSpaceRoom()) navigateSpace(mentionId);
        else navigateRoom(mentionId, eventId);
        return;
      }

      const viaServers = target.getAttribute('data-mention-via') || undefined;
      const path = getHomeRoomPath(mentionId, eventId);

      navigate(viaServers ? withSearchParam<_RoomSearchParams>(path, { viaServers }) : path);
    },
    [mx, navigate, navigateRoom, navigateSpace, roomId]
  );

  return handleClick;
};
