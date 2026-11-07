/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { createContext, useContext, useMemo } from 'react';
import { PendingObservableResult } from 'neurone/lib/utils/observable';
import { RoomMembership } from 'neurone/lib/api/types';
import { ObjectReader } from 'neurone/lib/utils';
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
import { StateEventType } from '../../types/matrix/room';
import { rUnsigned } from '../../client/reader';

export type MemberChangeType =
  | 'join'
  | 'leave'
  | 'kick'
  | 'ban'
  | 'knock'
  | 'invite'
  | 'nameChange'
  | 'avatarChange'
  | 'profileChange';

export type GetRoomMemberCallback = (userId: string) => JoinRoomMemberObject | undefined;
export type GetRoomMemberNameCallback = (userId: string) => string;
export type GetRoomMemberAvatarCallback = (userId: string) => string | undefined;
export type GetRoomMemberMembershipCallback = (userId: string) => RoomMembership | undefined;
export type GetRoomMemberMemberChangeTypeCallback = (
  userId: string
) => MemberChangeType | undefined;
export type GetRoomMemberIsNewChnageCallback = (userId: string) => boolean;
export type RoomMembersAPI = {
  getMember: GetRoomMemberCallback;
  getName: GetRoomMemberNameCallback;
  getAvatar: GetRoomMemberAvatarCallback;
  getMembership: GetRoomMemberMembershipCallback;
  getMemberChangeType: GetRoomMemberMemberChangeTypeCallback;
  isNewChange: GetRoomMemberIsNewChnageCallback;
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

  getMemberChangeType = (userId: string): MemberChangeType | undefined => {
    const member = this.getMember(userId);

    if (!member) {
      return undefined;
    }

    const { event } = member;

    if (event.type !== StateEventType.RoomMember) {
      return undefined;
    }

    const { content } = event;
    const membership = roomMemberContentMembership(content);

    const previousContent = rUnsigned.prevContent(event.unsigned);
    const previousMembership = previousContent && roomMemberContentMembership(previousContent);

    if (!membership) return membership;

    // Membership transitions
    if (!previousContent || previousMembership !== membership) {
      if (membership === 'leave' && event.sender !== userId) {
        return 'kick';
      }
      return membership;
    }

    // Profile changes
    if (
      ObjectReader.string(previousContent, 'displayname') !==
      ObjectReader.string(content, 'displayname')
    ) {
      return 'nameChange';
    }

    if (
      ObjectReader.string(previousContent, 'avatar_url') !==
      ObjectReader.string(content, 'avatar_url')
    ) {
      return 'avatarChange';
    }

    return membership;
  };

  /**
   * Detect if user has changed there member state event within last 24 hours.
   * @param userId
   * @returns true if `m.room.member` was sent withint 24 hours
   */
  isNewChange = (userId: string): boolean => {
    const member = this.getMember(userId);

    if (!member) return false;

    const { event } = member;

    if (event.type !== StateEventType.RoomMember) {
      return false;
    }

    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;

    return event.origin_server_ts >= last24Hours;
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
