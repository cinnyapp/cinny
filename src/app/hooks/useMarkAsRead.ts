import { useCallback } from 'react';
import { useClient } from './useClient';
import { getReadReceiptId, getUnreadThreadNotificationId } from '../../client/storage/collections';
import { ThreadId } from '../../types/matrix/room';
import { ReadMarker } from '../../client/ReadMarker';

export const useMarkAsRead = (roomId: string, threadId?: string) => {
  const ct = useClient();

  const clearNotificationCount = useCallback(async () => {
    if (threadId) {
      await ct.storage.unreadThreadNotifications.write.delete(
        getUnreadThreadNotificationId(roomId, threadId)
      );
    } else {
      await ct.storage.unreadNotifications.write.delete(roomId);
    }
  }, [ct, roomId, threadId]);

  const markAsRead = useCallback(async () => {
    // do not mark as read until first sync is complete
    // and we have latest read markers.
    if (ct.firstSync) return;

    const latestEvent = ct.roomToLatestEvent.read.get(roomId);
    const notification = threadId
      ? ct.threadNotifications.read.find(
          (n) => n.id === getUnreadThreadNotificationId(roomId, threadId)
        )
      : ct.notifications.read.find((n) => n.id === roomId);

    const count = notification?.unread.notification_count ?? 0;

    if (!latestEvent) {
      if (count > 0) await clearNotificationCount();
      return;
    }
    if (count > 0) {
      await ct.readMarker.markAsRead(roomId, 'm.read', latestEvent.event_id);
      await clearNotificationCount();
    }

    const receiptId = getReadReceiptId(roomId, ct.session.userId, threadId ?? ThreadId.Main);
    const receipt = ct.userReadReceipt.read.find((r) => r.id === receiptId);

    if (!receipt || !ReadMarker.hasUnread(receipt, latestEvent, ct.session.userId)) {
      return;
    }

    await ct.readMarker.markAsRead(roomId, 'm.read', latestEvent.event_id);
  }, [ct, roomId, threadId, clearNotificationCount]);

  return markAsRead;
};
