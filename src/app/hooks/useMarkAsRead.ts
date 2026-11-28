/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback } from 'react';
import { useClient } from './useClient';
import { getReadReceiptId, getUnreadThreadNotificationId } from '../../client/storage/collections';
import { ThreadId } from '../../types/matrix/room';
import { ReadMarker } from '../../client/ReadMarker';
import { useSetting, useSettings } from '../state/hooks/settings';
import { ClientContext } from '../../client/context';
import { RoomToNotifications } from '../state/room/roomToNotifications';
import { getTotalCount } from '../state/hooks/roomNotifications';

const getLatestTimelineEvent = (ct: ClientContext, roomId: string, threadId?: string) => {
  if (!threadId) return ct.roomToLatestEvent.read.get(roomId);

  const threadTimeline = ct.roomToTimeline.read.get(roomId)?.threads.read.get(threadId);
  const batch = threadTimeline?.batch.read;
  if (!batch) return undefined;
  if (batch.next.token) {
    // not latest event;
    return undefined;
  }
  const { events } = batch.messages;
  return events[events.length - 1];
};

export const useMarkAsRead = (roomId: string, threadId?: string) => {
  const ct = useClient();
  const { hideActivity } = useSettings();

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
    if (ct.firstSync.read) return;

    const latestEvent = getLatestTimelineEvent(ct, roomId, threadId);
    const notification = threadId
      ? ct.threadNotifications.read.find(
          (n) => n.id === getUnreadThreadNotificationId(roomId, threadId)
        )
      : ct.notifications.read.find((n) => n.id === roomId);

    const count = notification?.unread.notification_count ?? 0;

    if (count > 0) {
      await clearNotificationCount();
      await ct.readMarker.markAsRead(
        roomId,
        hideActivity ? 'm.read.private' : 'm.read',
        latestEvent?.event_id,
        threadId
      );
    }

    const receiptId = getReadReceiptId(roomId, ct.session.userId, threadId ?? ThreadId.Main);
    const receipt = ct.userReadReceipt.read.find((r) => r.id === receiptId);

    if (
      !receipt ||
      (latestEvent && !ReadMarker.hasUnread(receipt, latestEvent, ct.session.userId))
    ) {
      return;
    }

    await ct.readMarker.markAsRead(
      roomId,
      hideActivity ? 'm.read.private' : 'm.read',
      latestEvent?.event_id,
      threadId
    );
  }, [ct, roomId, threadId, clearNotificationCount, hideActivity]);

  return markAsRead;
};

export const useMarkMultipleRoomsAsRead = (
  rooms: string[],
  roomToNotifications: RoomToNotifications,
  unreadRooms: Set<string>
) => {
  const ct = useClient();
  const [hideActivity] = useSetting('hideActivity');

  const markAsRead = useCallback(() => {
    rooms.forEach((roomId) => {
      const n = roomToNotifications.get(roomId);
      if (n) {
        Array.from(n?.threads.entries()).forEach(([tId, tN]) => {
          if (getTotalCount(tN) > 0) {
            const latestEvent = getLatestTimelineEvent(ct, roomId, tId);
            ct.readMarker.markAsRead(
              roomId,
              hideActivity ? 'm.read.private' : 'm.read',
              latestEvent?.event_id,
              tId
            );
          }
        });
        if (getTotalCount(n) > 0) {
          const latestEvent = getLatestTimelineEvent(ct, roomId);
          ct.readMarker.markAsRead(
            roomId,
            hideActivity ? 'm.read.private' : 'm.read',
            latestEvent?.event_id
          );
        }
        return;
      }
      if (unreadRooms.has(roomId)) {
        const latestEvent = getLatestTimelineEvent(ct, roomId);
        ct.readMarker.markAsRead(
          roomId,
          hideActivity ? 'm.read.private' : 'm.read',
          latestEvent?.event_id
        );
      }
    });
  }, [ct, rooms, roomToNotifications, unreadRooms, hideActivity]);

  return markAsRead;
};
