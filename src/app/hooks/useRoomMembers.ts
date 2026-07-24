import { createContext, useCallback, useContext, useMemo } from 'react';
import { PendingObservableResult } from 'neurone/lib/utils/observable';
import { RoomMembership } from 'neurone/lib/api/types';
import { useClient } from './useClient';
import { useObservableValuePromise } from './useObservableValue';
import { JoinRoomMemberObject } from '../../client/storage/collections';
import { getMxIdLocalPart } from '../utils/matrix';
import {
  roomMemberContentAvatarUrl,
  roomMemberContentDisplayname,
  roomMemberContentMembership,
} from '../utils/room';

export type GetRoomMemberCallback = (userId: string) => JoinRoomMemberObject | undefined;
export type GetRoomMemberNameCallback = (userId: string) => string;
export type GetRoomMemberAvatarCallback = (userId: string) => string | undefined;
export type GetRoomMemberMembershipCallback = (userId: string) => RoomMembership | undefined;
export type RoomMembersAPI = {
  getMember: GetRoomMemberCallback;
  getName: GetRoomMemberNameCallback;
  getAvatar: GetRoomMemberAvatarCallback;
  getMembership: GetRoomMemberMembershipCallback;
  memberEventsResult: PendingObservableResult<JoinRoomMemberObject[]>;
};

export const useCreateRoomMembersAPI = (roomId: string): RoomMembersAPI => {
  const ct = useClient();
  const memberEventsPromise = useMemo(
    () => ct.storage.joinRoomMember.observableRead.queryIndex('roomId', roomId),
    [ct, roomId]
  );

  const memberEventsResult = useObservableValuePromise(memberEventsPromise);
  const memberEvents = memberEventsResult.value;

  const userIdToMemberEvent = useMemo(() => {
    const uToM: Record<string, JoinRoomMemberObject> = {};
    memberEvents?.forEach((member) => {
      uToM[member.userId] = member;
    });
    return uToM;
  }, [memberEvents]);

  const getMember: GetRoomMemberCallback = useCallback(
    (userId) => {
      const member = userIdToMemberEvent[userId];
      return member;
    },
    [userIdToMemberEvent]
  );

  const getName: GetRoomMemberNameCallback = useCallback(
    (userId) => {
      const member = getMember(userId);

      const content = member?.event.content;
      const displayName = content ? roomMemberContentDisplayname(content) : undefined;

      return displayName || getMxIdLocalPart(userId) || userId;
    },
    [getMember]
  );

  const getAvatar: GetRoomMemberAvatarCallback = useCallback(
    (userId) => {
      const member = getMember(userId);

      const content = member?.event.content;
      if (!content) return undefined;

      return roomMemberContentAvatarUrl(content);
    },
    [getMember]
  );

  const getMembership: GetRoomMemberMembershipCallback = useCallback(
    (userId) => {
      const member = getMember(userId);

      const content = member?.event.content;
      if (!content) return undefined;

      return roomMemberContentMembership(content);
    },
    [getMember]
  );

  const api: RoomMembersAPI = useMemo(
    () => ({ memberEventsResult, getMember, getName, getAvatar, getMembership }),
    [memberEventsResult, getMember, getName, getAvatar, getMembership]
  );
  return api;
};

const RoomMembersAPIContext = createContext<RoomMembersAPI | null>(null);
export const RoomMembersAPIProvider = RoomMembersAPIContext.Provider;

export const useRoomMembersAPI = (): RoomMembersAPI => {
  const api = useContext(RoomMembersAPIContext);
  if (!api) {
    throw new Error('Room Members context is not provided!');
  }

  return api;
};
