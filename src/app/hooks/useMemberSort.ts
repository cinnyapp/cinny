import { useCallback, useMemo } from 'react';
import { JoinRoomMemberObject } from '../../client/storage/collections';
import { GetRoomMemberNameCallback } from './useRoomMembers';

export const getMemberSort = (getName: GetRoomMemberNameCallback) => ({
  Ascending: (a: JoinRoomMemberObject, b: JoinRoomMemberObject) =>
    getName(a.userId).toLowerCase() < getName(b.userId).toLowerCase() ? -1 : 1,
  Descending: (a: JoinRoomMemberObject, b: JoinRoomMemberObject) =>
    getName(a.userId).toLowerCase() > getName(b.userId).toLowerCase() ? -1 : 1,
  NewestFirst: (a: JoinRoomMemberObject, b: JoinRoomMemberObject) =>
    b.event.origin_server_ts - a.event.origin_server_ts,
  Oldest: (a: JoinRoomMemberObject, b: JoinRoomMemberObject) =>
    a.event.origin_server_ts - b.event.origin_server_ts,
});

export type MemberSortFn = (a: JoinRoomMemberObject, b: JoinRoomMemberObject) => number;

export type MemberSortItem = {
  name: string;
  sortFn: MemberSortFn;
};

export const useMemberSortMenu = (getName: GetRoomMemberNameCallback): MemberSortItem[] => {
  const sortFun = useMemo(() => getMemberSort(getName), [getName]);

  return useMemo(
    () => [
      {
        name: 'A to Z',
        sortFn: sortFun.Ascending,
      },
      {
        name: 'Z to A',
        sortFn: sortFun.Descending,
      },
      {
        name: 'Newest',
        sortFn: sortFun.NewestFirst,
      },
      {
        name: 'Oldest',
        sortFn: sortFun.Oldest,
      },
    ],
    [sortFun]
  );
};

export const useMemberSort = (index: number, memberSort: MemberSortItem[]): MemberSortItem => {
  const item = memberSort[index] ?? memberSort[0];
  return item;
};

export const useMemberPowerSort = (
  creators: Set<string> | undefined,
  getPowerLevel: (userId: string) => number
): MemberSortFn => {
  const sort: MemberSortFn = useCallback(
    (a, b) => {
      if (creators?.has(a.userId) && creators?.has(b.userId)) {
        return 0;
      }
      if (creators?.has(a.userId)) return -1;
      if (creators?.has(b.userId)) return 1;

      return getPowerLevel(b.userId) - getPowerLevel(a.userId);
    },
    [creators, getPowerLevel]
  );

  return sort;
};
