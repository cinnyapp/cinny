import { useMemo } from 'react';
import { GetRoomMemberMembershipCallback } from './useRoomMembers';
import { JoinRoomMemberObject } from '../../client/storage/collections';

export const getMembershipFilter = (getMembership: GetRoomMemberMembershipCallback) => ({
  filterJoined: (m: JoinRoomMemberObject) => getMembership(m.userId) === 'join',
  filterInvited: (m: JoinRoomMemberObject) => getMembership(m.userId) === 'invite',
  filterLeaved: (m: JoinRoomMemberObject) =>
    getMembership(m.userId) === 'leave' && m.event.state_key === m.event.sender,
  filterKicked: (m: JoinRoomMemberObject) =>
    getMembership(m.userId) === 'leave' && m.event.state_key !== m.event.sender,
  filterBanned: (m: JoinRoomMemberObject) => getMembership(m.userId) === 'ban',
});

export type MembershipFilterFn = (m: JoinRoomMemberObject) => boolean;

export type MembershipFilterItem = {
  name: string;
  filterFn: MembershipFilterFn;
};

export const useMembershipFilterMenu = (
  getMembership: GetRoomMemberMembershipCallback
): MembershipFilterItem[] => {
  const filterFn = useMemo(() => getMembershipFilter(getMembership), [getMembership]);

  return useMemo(
    () => [
      {
        name: 'Joined',
        filterFn: filterFn.filterJoined,
      },
      {
        name: 'Invited',
        filterFn: filterFn.filterInvited,
      },
      {
        name: 'Left',
        filterFn: filterFn.filterLeaved,
      },
      {
        name: 'Kicked',
        filterFn: filterFn.filterKicked,
      },
      {
        name: 'Banned',
        filterFn: filterFn.filterBanned,
      },
    ],
    [filterFn]
  );
};

export const useMembershipFilter = (
  index: number,
  membershipFilter: MembershipFilterItem[]
): MembershipFilterItem => {
  const filter = membershipFilter[index] ?? membershipFilter[0];
  return filter;
};
