import { useCallback, useMemo } from 'react';
import { useClient } from './useClient';
import { useObservableValuePromise } from './useObservableValue';
import { getMxIdLocalPart } from '../utils/matrix';
import {
  roomMemberContentAvatarUrl,
  roomMemberContentDisplayname,
  roomMemberContentMembership,
} from '../utils/room';
import { getJoinRoomMemberId } from '../../client/storage/collections';

export const useRoomMember = (roomId: string, userId: string) => {
  const ct = useClient();
  const memberEventPromise = useMemo(
    () => ct.storage.joinRoomMember.observableRead.get(getJoinRoomMemberId(roomId, userId)),
    [ct, roomId, userId]
  );

  const memberEventResult = useObservableValuePromise(memberEventPromise);

  const member = memberEventResult.value;

  const getName = useCallback(() => {
    const content = member?.event.content;
    const displayName = content ? roomMemberContentDisplayname(content) : undefined;

    return displayName || getMxIdLocalPart(userId) || userId;
  }, [member, userId]);

  const getAvatar = useCallback(() => {
    const content = member?.event.content;
    if (!content) return undefined;

    return roomMemberContentAvatarUrl(content);
  }, [member]);

  const getMembership = useCallback(() => {
    const content = member?.event.content;
    if (!content) return undefined;

    return roomMemberContentMembership(content);
  }, [member]);

  return {
    memberEventResult,
    getName,
    getAvatar,
    getMembership,
  };
};
