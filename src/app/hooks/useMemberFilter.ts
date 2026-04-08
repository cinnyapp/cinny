import { useMemo } from 'react';
import i18next from 'i18next';
import { RoomMember } from 'matrix-js-sdk';
import { Membership } from '../../types/matrix/room';

export const MembershipFilter = {
  filterJoined: (m: RoomMember) => m.membership === Membership.Join,
  filterInvited: (m: RoomMember) => m.membership === Membership.Invite,
  filterLeaved: (m: RoomMember) =>
    m.membership === Membership.Leave &&
    m.events.member?.getStateKey() === m.events.member?.getSender(),
  filterKicked: (m: RoomMember) =>
    m.membership === Membership.Leave &&
    m.events.member?.getStateKey() !== m.events.member?.getSender(),
  filterBanned: (m: RoomMember) => m.membership === Membership.Ban,
};

export type MembershipFilterFn = (m: RoomMember) => boolean;

export type MembershipFilterItem = {
  name: string;
  filterFn: MembershipFilterFn;
};

export const useMembershipFilterMenu = (): MembershipFilterItem[] =>
  useMemo(
    () => [
      {
        name: i18next.t('common:joined', { defaultValue: 'Joined' }),
        filterFn: MembershipFilter.filterJoined,
      },
      {
        name: i18next.t('common:invited', { defaultValue: 'Invited' }),
        filterFn: MembershipFilter.filterInvited,
      },
      {
        name: i18next.t('common:left', { defaultValue: 'Left' }),
        filterFn: MembershipFilter.filterLeaved,
      },
      {
        name: i18next.t('common:kicked', { defaultValue: 'Kicked' }),
        filterFn: MembershipFilter.filterKicked,
      },
      {
        name: i18next.t('common:banned', { defaultValue: 'Banned' }),
        filterFn: MembershipFilter.filterBanned,
      },
    ],
    []
  );

export const useMembershipFilter = (
  index: number,
  membershipFilter: MembershipFilterItem[]
): MembershipFilterItem => {
  const filter = membershipFilter[index] ?? membershipFilter[0];
  return filter;
};
