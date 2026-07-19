import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { UnreadNotificationCounts } from 'neurone/lib/api/types';
import {
  Notifications,
  RoomToNotifications,
  roomToNotificationsAtom,
} from '../room/roomToNotifications';

const compareUnreadNotifications = (
  n1?: UnreadNotificationCounts,
  n2?: UnreadNotificationCounts
): boolean =>
  n1?.highlight_count === n2?.highlight_count && n1?.notification_count === n2?.notification_count;

const compareNotifications = (n1?: Notifications, n2?: Notifications): boolean => {
  if (n1 && n2) {
    return (
      compareUnreadNotifications(n1, n2) &&
      n1.threads.size === n2.threads.size &&
      Array.from(n1.threads.keys()).every((threadId) =>
        compareUnreadNotifications(n1.threads.get(threadId), n2.threads.get(threadId))
      )
    );
  }

  return n1 === n2;
};

const compareRoomsNotifications = (rn1: RoomToNotifications, rn2: RoomToNotifications): boolean =>
  rn1.size === rn2.size &&
  Array.from(rn1.keys()).every((roomId) => compareNotifications(rn1.get(roomId), rn2.get(roomId)));

export const useRoomsNotifications = (
  rooms: string[],
  notificationsAtom: typeof roomToNotificationsAtom
): RoomToNotifications => {
  const selector = useCallback(
    (roomToNotifications: RoomToNotifications) => {
      const selectedNotifications: RoomToNotifications = new Map();
      rooms.forEach((roomId) => {
        const n = roomToNotifications.get(roomId);
        if (n) selectedNotifications.set(roomId, n);
      });

      return selectedNotifications;
    },
    [rooms]
  );
  return useAtomValue(selectAtom(notificationsAtom, selector, compareRoomsNotifications));
};

export const useRoomNotifications = (
  roomId: string,
  notificationsAtom: typeof roomToNotificationsAtom
): Notifications | undefined => {
  const selector = useCallback(
    (roomToNotifications: RoomToNotifications) => roomToNotifications.get(roomId),
    [roomId]
  );
  return useAtomValue(selectAtom(notificationsAtom, selector, compareNotifications));
};

export type TotalNotifications = {
  count: number;
  highlight: boolean;
};

const getTotalCount = (n: UnreadNotificationCounts): number => {
  const highlight = n.highlight_count ?? 0;
  const total = n.notification_count ?? 0;

  return total >= highlight ? total : highlight;
};

const setTotal = (total: TotalNotifications, n: UnreadNotificationCounts) => {
  // eslint-disable-next-line no-param-reassign
  total.count += getTotalCount(n);

  if (!total.highlight && n.highlight_count && n.highlight_count > 0) {
    // eslint-disable-next-line no-param-reassign
    total.highlight = true;
  }
};

export const getRoomsTotalNotifications = (
  roomsToNotifications: RoomToNotifications
): TotalNotifications => {
  const total: TotalNotifications = {
    count: 0,
    highlight: false,
  };

  roomsToNotifications.forEach((n) => {
    setTotal(total, n);
    n.threads.forEach((tn) => setTotal(total, tn));
  });

  return total;
};

export const useRoomsTotalNotifications = (roomsToNotifications: RoomToNotifications) =>
  useMemo(() => getRoomsTotalNotifications(roomsToNotifications), [roomsToNotifications]);

export const getRoomTotalNotifications = (notifications?: Notifications): TotalNotifications => {
  const total: TotalNotifications = {
    count: 0,
    highlight: false,
  };

  setTotal(total, notifications ?? {});
  notifications?.threads.forEach((tn) => setTotal(total, tn));

  return total;
};

export const useRoomTotalNotifications = (notifications?: Notifications) =>
  useMemo(() => getRoomTotalNotifications(notifications), [notifications]);

export const getThreadsTotalNotifications = (
  threadsNotifications: Map<string, UnreadNotificationCounts>
): TotalNotifications => {
  const total: TotalNotifications = {
    count: 0,
    highlight: false,
  };
  threadsNotifications.forEach((tn) => setTotal(total, tn));

  return total;
};
export const useThreadsTotalNotifications = (
  threadsNotifications: Map<string, UnreadNotificationCounts>
) => useMemo(() => getThreadsTotalNotifications(threadsNotifications), [threadsNotifications]);
