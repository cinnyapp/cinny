import { createContext, useContext, useMemo } from 'react';
import { PendingObservableResult } from 'neurone/lib/utils/observable';
import { RoomMembership } from 'neurone/lib/api/types';
import { useClient } from './useClient';
import { useObservableValuePromise } from './useObservableValue';
import { getJoinRoomMemberId, JoinRoomMemberObject } from '../../client/storage/collections';
import { getMxIdLocalPart } from '../utils/matrix';
import {
  roomMemberContentAvatarUrl,
  roomMemberContentDisplayname,
  roomMemberContentMembership,
} from '../utils/room';
import { MemberCache } from '../../client/MemberCache';

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
  userIdToMemberEvent: Record<string, JoinRoomMemberObject>;
};

class MembersAPI implements RoomMembersAPI {
  public userIdToMemberEvent: Record<string, JoinRoomMemberObject>;

  constructor(
    public readonly memberEventsResult: PendingObservableResult<JoinRoomMemberObject[]>,
    uIdToMemberEvent?: Record<string, JoinRoomMemberObject>
  ) {
    this.userIdToMemberEvent = uIdToMemberEvent ?? {};
    if (!uIdToMemberEvent) {
      memberEventsResult.value?.forEach((member) => {
        this.userIdToMemberEvent[member.userId] = member;
      });
    }
  }

  getMember = (userId: string): JoinRoomMemberObject | undefined => {
    const member = this.userIdToMemberEvent[userId];
    return member;
  };

  getName = (userId: string): string => {
    const member = this.getMember(userId);

    const content = member?.event.content;
    const displayName = content ? roomMemberContentDisplayname(content) : undefined;

    return displayName || getMxIdLocalPart(userId) || userId;
  };

  getAvatar = (userId: string): string | undefined => {
    const member = this.getMember(userId);

    const content = member?.event.content;
    if (!content) return undefined;

    return roomMemberContentAvatarUrl(content);
  };

  getMembership = (userId: string): RoomMembership | undefined => {
    const member = this.getMember(userId);

    const content = member?.event.content;
    if (!content) return undefined;

    return roomMemberContentMembership(content);
  };
}

class MembersAPIWithCache extends MembersAPI implements RoomMembersAPI {
  constructor(
    private readonly memberCache: MemberCache,
    private readonly roomId: string,
    memberEventsResult: PendingObservableResult<JoinRoomMemberObject[]>,
    uIdToMemberEvent?: Record<string, JoinRoomMemberObject>
  ) {
    super(memberEventsResult, uIdToMemberEvent);
  }

  override getMember = (userId: string): JoinRoomMemberObject | undefined => {
    const member = this.userIdToMemberEvent[userId];
    if (member) {
      this.memberCache.putMember(member);
      return member;
    }
    return this.memberCache.getMember(this.roomId, userId);
  };
}

export const useCreateRoomMembersAPI = (roomId: string): RoomMembersAPI => {
  const ct = useClient();
  const memberEventsPromise = useMemo(
    () => ct.storage.joinRoomMember.observableRead.queryIndex('roomId', roomId),
    [ct, roomId]
  );

  const memberEventsResult = useObservableValuePromise(memberEventsPromise);

  const api = useMemo(() => new MembersAPI(memberEventsResult), [memberEventsResult]);
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

export const useRoomMembersAPIWithCache = (roomId: string, api: RoomMembersAPI): RoomMembersAPI => {
  const ct = useClient();
  const apiWithCache = useMemo(
    () =>
      new MembersAPIWithCache(
        ct.memberCache,
        roomId,
        api.memberEventsResult,
        api.userIdToMemberEvent
      ),
    [api, ct, roomId]
  );

  return apiWithCache;
};

export const useRoomMembers = (roomId: string, users: string[]) => {
  const ct = useClient();
  const memberEventsPromise = useMemo(
    () =>
      ct.storage.joinRoomMember.observableRead.getMultiple(
        users.map((userId) => getJoinRoomMemberId(roomId, userId))
      ),
    [ct, roomId, users]
  );

  const memberEventsResult = useObservableValuePromise(memberEventsPromise);

  const memberEvents = useMemo(() => {
    if (memberEventsResult.value) {
      return {
        value: memberEventsResult.value.filter((i) => i !== undefined),
      };
    }
    return memberEventsResult;
  }, [memberEventsResult]);

  const api = useMemo(() => new MembersAPI(memberEvents), [memberEvents]);
  return api;
};
