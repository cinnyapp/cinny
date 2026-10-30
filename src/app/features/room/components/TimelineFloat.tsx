import React, { useCallback } from 'react';
import { as, Box, Chip, Icon, Icons, Text } from 'folds';
import { ObservableValue } from 'neurone/lib/utils/observable';
import classNames from 'classnames';
import * as css from './styles.css';
import { useUserReadReceipt } from '../../../hooks/useReadReceipt';
import { useObservableValue, useScopedObservableValue } from '../../../hooks/useObservableValue';
import { useClient } from '../../../hooks/useClient';
import { useRoom } from '../../../hooks/useRoom';
import { ReadMarker } from '../../../../client/ReadMarker';
import { getUnreadThreadNotificationId } from '../../../../client/storage/collections';
import { ThreadMeta } from '../../../../client/room/ThreadMeta';

export const TimelineFloat = as<'div', css.TimelineFloatVariants>(
  ({ position, className, ...props }, ref) => (
    <Box
      className={classNames(css.TimelineFloat({ position }), className)}
      justifyContent="Center"
      alignItems="Center"
      gap="200"
      {...props}
      ref={ref}
    />
  )
);

type UnreadControlsProps = {
  visible?: boolean;
  onJumpToUnread?: () => void;
  onMarkAsRead: () => void;
};
export function UnreadControls({ visible, onJumpToUnread, onMarkAsRead }: UnreadControlsProps) {
  const ct = useClient();
  const roomId = useRoom();
  const firstSync = useObservableValue(ct.firstSync);

  const readReceipt = useUserReadReceipt();

  const latestEvent = useScopedObservableValue(
    ct.roomToLatestEvent,
    useCallback((roomToLatestEvent) => roomToLatestEvent.get(roomId), [roomId])
  );
  const notificationCount = useScopedObservableValue(
    ct.notifications,
    useCallback(
      (notifications) => notifications.find((n) => n.id === roomId)?.unread.notification_count,
      [roomId]
    )
  );

  if (firstSync) {
    // do not show jump to unread because we do not have
    // latest read receipt and notification count yet.
    return null;
  }

  const hasUnread =
    readReceipt && latestEvent && ReadMarker.hasUnread(readReceipt, latestEvent, ct.session.userId);

  const showDivider = (notificationCount && notificationCount > 0) || hasUnread;

  if (!visible || !showDivider) return null;

  return (
    <TimelineFloat position="Top">
      {onJumpToUnread && hasUnread && (
        <Chip
          variant="Primary"
          radii="Pill"
          outlined
          before={<Icon size="50" src={Icons.MessageUnread} />}
          onClick={onJumpToUnread}
        >
          <Text size="L400">Jump to Unread</Text>
        </Chip>
      )}

      <Chip
        variant="SurfaceVariant"
        radii="Pill"
        outlined
        before={<Icon size="50" src={Icons.CheckTwice} />}
        onClick={onMarkAsRead}
      >
        <Text size="L400">Mark as Read</Text>
      </Chip>
    </TimelineFloat>
  );
}

export function ThreadUnreadControls({
  threadId,
  meta,
  visible,
  onJumpToUnread,
  onMarkAsRead,
}: UnreadControlsProps & {
  threadId: string;
  meta: ObservableValue<ThreadMeta | undefined>;
}) {
  const ct = useClient();
  const roomId = useRoom();
  const firstSync = useObservableValue(ct.firstSync);

  const readReceipt = useUserReadReceipt(threadId);

  const latestEvent = useScopedObservableValue(
    meta,
    useCallback((m) => m?.latestReplyEvent, [])
  );
  const notificationCount = useScopedObservableValue(
    ct.threadNotifications,
    useCallback(
      (notifications) =>
        notifications.find((n) => n.id === getUnreadThreadNotificationId(roomId, threadId))?.unread
          .notification_count,
      [roomId, threadId]
    )
  );

  if (firstSync) {
    // do not show jump to unread because we do not have
    // latest read receipt and notification count yet.
    return null;
  }

  const hasUnread =
    readReceipt && latestEvent && ReadMarker.hasUnread(readReceipt, latestEvent, ct.session.userId);

  const showDivider = (notificationCount && notificationCount > 0) || hasUnread;

  if (!visible || !showDivider) return null;

  return (
    <TimelineFloat position="Top">
      {onJumpToUnread && hasUnread && (
        <Chip
          variant="Primary"
          radii="Pill"
          outlined
          before={<Icon size="50" src={Icons.MessageUnread} />}
          onClick={onJumpToUnread}
        >
          <Text size="L400">Jump to Unread</Text>
        </Chip>
      )}

      <Chip
        variant="SurfaceVariant"
        radii="Pill"
        outlined
        before={<Icon size="50" src={Icons.CheckTwice} />}
        onClick={onMarkAsRead}
      >
        <Text size="L400">Mark as Read</Text>
      </Chip>
    </TimelineFloat>
  );
}
