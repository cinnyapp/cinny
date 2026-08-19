import { useEffect, useState } from 'react';
import { NotificationCountType, Room, RoomEvent, Thread, ThreadEvent } from 'matrix-js-sdk';

/**
 * Live per-thread unread reply count for the current user.
 *
 * Sources the count from the room's thread notification map
 * (`room.getThreadUnreadNotificationCount`), the same data the left sidebar's
 * per-room unread uses (`room.getUnreadNotificationCount`), so the thread-list
 * pill feels consistent with the channel list. Synapse keeps the thread's
 * `total` count current in the sync, and when a *threaded* read receipt is sent
 * (e.g. opening the thread, or the menu's "Mark as read") the echoed receipt
 * resets the count to zero, so the pill disappears without a reload.
 *
 * Re-renders whenever the room emits an unread-notification change (which fires
 * with the thread id for thread counts), a thread event, or any receipt.
 */
export function useThreadUnreadCount(room: Room, thread: Thread): number {
  const [, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((r) => r + 1);

    // Fired by room.setThreadUnreadNotificationCount with (notification, threadId);
    // the server's sync resets the count when a threaded receipt arrives.
    const onUnreadNotifications = () => bump();
    const handleChange = () => bump();

    room.on(RoomEvent.UnreadNotifications as never, onUnreadNotifications as never);
    room.on(ThreadEvent.NewReply as never, handleChange as never);
    room.on(ThreadEvent.Update as unknown as never, handleChange as never);
    room.on(ThreadEvent.Delete as never, handleChange as never);
    room.on(RoomEvent.Receipt as never, bump as never);
    return () => {
      room.off(RoomEvent.UnreadNotifications as never, onUnreadNotifications as never);
      room.off(ThreadEvent.NewReply as never, handleChange as never);
      room.off(ThreadEvent.Update as unknown as never, handleChange as never);
      room.off(ThreadEvent.Delete as never, handleChange as never);
      room.off(RoomEvent.Receipt as never, bump as never);
    };
  }, [room]);

  return room.getThreadUnreadNotificationCount(thread.id, NotificationCountType.Total);
}
