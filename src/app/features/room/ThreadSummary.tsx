import React, { MouseEventHandler, useEffect, useState } from 'react';
import { Icon, Icons, Text } from 'folds';
import { Room, RoomEvent, Thread, ThreadEvent } from 'matrix-js-sdk';

import * as css from './ThreadSummary.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';

/**
 * Element-style thread summary shown beneath a root message in the main timeline
 * when that message starts a thread. Shows the thread icon (accented/unread icon
 * when the current user has unread replies), the reply count, and a preview of
 * the last reply. Clicking it opens that thread in the ThreadsDrawer panel.
 */
type ThreadSummaryProps = {
  room: Room;
  thread: Thread;
  onOpen: () => void;
};

export function ThreadSummary({ room, thread, onOpen }: ThreadSummaryProps) {
  const mx = useMatrixClient();
  // Bumped by SDK events (new reply / update / delete / receipt) so the summary
  // stays live with the thread and its unread state, mirroring RoomTimeline's
  // event-driven model rather than polling.
  const [, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((r) => r + 1);
    const handleDelete = () => bump();
    const handleNewReply = () => bump();
    const handleUpdate = () => bump();

    room.on(ThreadEvent.NewReply as never, handleNewReply as never);
    room.on(ThreadEvent.Update as unknown as never, handleUpdate as never);
    room.on(ThreadEvent.Delete as never, handleDelete as never);
    // read receipts arriving change the unread state for this user
    room.on(RoomEvent.Receipt as never, bump as never);
    return () => {
      room.off(ThreadEvent.NewReply as never, handleNewReply as never);
      room.off(ThreadEvent.Update as unknown as never, handleUpdate as never);
      room.off(ThreadEvent.Delete as never, handleDelete as never);
      room.off(RoomEvent.Receipt as never, bump as never);
    };
  }, [room]);

  // The Thread object held by this row is the canonical one from room.getThread();
  // re-read it on revision so counts/preview reflect the latest data.
  const liveThread = room.getThread(thread.id) ?? thread;
  const lastReply = liveThread.lastReply() ?? liveThread.replyToEvent;
  const replyCount = Math.max(0, liveThread.length);
  const preview = (() => {
    if (!lastReply) return undefined;
    const { body } = lastReply.getContent();
    if (typeof body !== 'string') return undefined;
    const trimmed = body.trim();
    // first few words of the last reply, like Element
    return trimmed.slice(0, 120);
  })();

  const myId = mx.getSafeUserId();
  const iSentLast = !!lastReply && lastReply.getSender() === myId;
  const hasUnread =
    !!lastReply && !iSentLast && !!myId && !liveThread.hasUserReadEvent(myId, lastReply.getId());

  if (replyCount <= 0) return null;

  const handleClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    onOpen();
  };

  return (
    <button
      type="button"
      className={css.ThreadSummary}
      onClick={handleClick}
      aria-label={hasUnread ? 'Open thread with unread replies' : 'Open thread'}
    >
      <Icon size="100" src={Icons.Thread} style={{ flexShrink: 0 }} />
      <Text size="T200" priority="300" truncate style={{ flexGrow: 1 }} align="Start">
        {preview
          ? `${replyCount} reply${replyCount === 1 ? '' : 's'} · ${preview}`
          : `${replyCount} reply${replyCount === 1 ? '' : 's'}`}
      </Text>
    </button>
  );
}
