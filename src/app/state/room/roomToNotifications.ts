import { atom, useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { UnreadNotificationCounts } from 'neurone/lib/api/types';
import { useRoomsNotificationPreferencesContext } from '../../hooks/useRoomsNotificationPreferences';
import { ClientContext } from '../../../client/context';
import { AsyncStatus, useAsyncCallbackValue } from '../../hooks/useAsyncCallback';

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

  const [unreadState] = useAsyncCallbackValue(
    useCallback(async () => {
      const notifications = await ct.storage.unreadNotifications.observableRead.getAll();
      const threadNotifications =
        await ct.storage.unreadThreadNotifications.observableRead.getAll();

      return {
        notifications,
        threadNotifications,
      };
    }, [ct])
  );

  const unread = unreadState.status === AsyncStatus.Success ? unreadState.data : undefined;

  const processNotifications = useCallback(() => {
    const notifications = unread?.notifications.read ?? [];
    const threadNotifications = unread?.threadNotifications.read ?? [];
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
  }, [unread, setNotificationAtom, roomsNotificationPreferences]);

  useEffect(() => {
    if (unread) {
      processNotifications();
    }

    const unsubscribeN = unread?.notifications.subscribe(() => processNotifications());
    const unsubscribeTn = unread?.threadNotifications.subscribe(() => processNotifications());
    return () => {
      unsubscribeN?.();
      unsubscribeTn?.();
    };
  }, [unread, processNotifications]);
};
