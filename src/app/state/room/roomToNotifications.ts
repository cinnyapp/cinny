import { atom, useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { UnreadNotificationCounts } from 'neurone/lib/api/types';
import { useRoomsNotificationPreferencesContext } from '../../hooks/useRoomsNotificationPreferences';
import { ClientContext } from '../../../client/context';
import { useObservableValue } from '../../hooks/useObservableValue';

export type Notifications = UnreadNotificationCounts & {
  threads: Map<string, UnreadNotificationCounts>;
};
export type RoomToNotifications = Map<string, Notifications>;

export const roomToNotificationsAtom = atom<RoomToNotifications>(new Map());

export const useBindRoomToNotificationsAtom = (
  ct: ClientContext,
  notificationsAtom: typeof roomToNotificationsAtom
) => {
  const setNotificationAtom = useSetAtom(notificationsAtom);
  const roomsNotificationPreferences = useRoomsNotificationPreferencesContext();
  const notifications = useObservableValue(ct.notifications);
  const threadNotifications = useObservableValue(ct.threadNotifications);

  const processNotifications = useCallback(() => {
    const { mute } = roomsNotificationPreferences;

    const roomToThreadsNotifications = new Map<string, Map<string, UnreadNotificationCounts>>();
    threadNotifications.forEach((item) => {
      if (mute.has(item.roomId)) return;

      const tn: Map<string, UnreadNotificationCounts> =
        roomToThreadsNotifications.get(item.roomId) ?? new Map();
      tn.set(item.threadId, item.unread);
      roomToThreadsNotifications.set(item.roomId, tn);
    });

    const roomToNotifications: RoomToNotifications = new Map();
    notifications.forEach((item) => {
      if (mute.has(item.id)) return;

      roomToNotifications.set(item.id, {
        ...item.unread,
        threads: new Map(),
      });
    });

    roomToThreadsNotifications.forEach((tn, roomId) => {
      const n = roomToNotifications.get(roomId) ?? { threads: new Map() };
      n.threads = tn;
      roomToNotifications.set(roomId, n);
    });

    setNotificationAtom(roomToNotifications);
  }, [notifications, threadNotifications, setNotificationAtom, roomsNotificationPreferences]);

  useEffect(() => {
    processNotifications();
  }, [processNotifications]);
};
