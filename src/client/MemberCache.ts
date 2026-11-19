/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { getJoinRoomMemberId, JoinRoomMemberObject } from './storage/collections';

/**
 * An in memory cache of accesssed member event.
 * Used as fallback when members are loading from service worker.
 *
 * Its helps to prevent the room member flickering.
 */
export class MemberCache {
  private readonly idToRoomMember = new Map<string, JoinRoomMemberObject>();

  public getMember(roomId: string, userId: string): JoinRoomMemberObject | undefined {
    return this.idToRoomMember.get(getJoinRoomMemberId(roomId, userId));
  }

  public putMember(memberObj: JoinRoomMemberObject): void {
    const id = getJoinRoomMemberId(memberObj.roomId, memberObj.userId);
    this.idToRoomMember.set(id, memberObj);
  }
}
