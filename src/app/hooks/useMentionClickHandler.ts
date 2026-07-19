import { ReactEventHandler, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomNavigate } from './useRoomNavigate';
import { isRoomId, isUserId } from '../utils/matrix';
import { getHomeRoomPath, withSearchParam } from '../pages/pathUtils';
import { _RoomSearchParams } from '../pages/paths';
import { useOpenUserRoomProfile } from '../state/hooks/userRoomProfile';
import { useSpaceOptionally } from './useSpace';
import { useClient } from './useClient';

export const useMentionClickHandler = (roomId: string): ReactEventHandler<HTMLElement> => {
  const ct = useClient();
  const { navigateRoom, navigateSpace } = useRoomNavigate();
  const navigate = useNavigate();
  const openProfile = useOpenUserRoomProfile();
  const spaceId = useSpaceOptionally();

  const handleClick: ReactEventHandler<HTMLElement> = useCallback(
    (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      const target = evt.currentTarget;
      const mentionId = target.getAttribute('data-mention-id');
      if (typeof mentionId !== 'string') return;

      if (isUserId(mentionId)) {
        openProfile(roomId, spaceId, mentionId, target.getBoundingClientRect());
        return;
      }

      const eventId = target.getAttribute('data-mention-event-id') || undefined;
      if (isRoomId(mentionId) && ct.rooms.join.read.includes(mentionId)) {
        if (ct.spaceRooms.read.has(mentionId)) navigateSpace(mentionId);
        else navigateRoom(mentionId, eventId);
        return;
      }

      const viaServers = target.getAttribute('data-mention-via') || undefined;
      const path = getHomeRoomPath(mentionId, eventId);

      navigate(viaServers ? withSearchParam<_RoomSearchParams>(path, { viaServers }) : path);
    },
    [ct, navigate, navigateRoom, navigateSpace, roomId, spaceId, openProfile]
  );

  return handleClick;
};
