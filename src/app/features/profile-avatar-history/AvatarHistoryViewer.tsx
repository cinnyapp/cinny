import React, { useMemo } from 'react';
import { Room } from 'matrix-js-sdk';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { MediaViewer, useStableIndex, ViewerItem } from '../media-viewer/MediaViewer';
import { AvatarHistoryEntry, describeHistoryEntry } from './avatarHistory';
import { useAvatarHistory } from './useAvatarHistory';

type AvatarHistoryViewerProps = {
  room: Room;
  userId?: string;
  includeRoom?: boolean;
  onClose: () => void;
};

const toItem = (
  entry: AvatarHistoryEntry,
  i: number,
  title: string,
  sender: string
): ViewerItem => ({
  eventId: `avatar:${entry.source}:${i}:${entry.mxc}`,
  ts: entry.since ?? entry.before ?? 0,
  sender,
  kind: 'image',
  body: title,
  mxc: entry.mxc,
  title,
  subtitle: describeHistoryEntry(entry),
});

/**
 * "Profile pictures" mode of the viewer: the current picture first, then the
 * earlier ones this room has seen, newest to oldest.
 */
export function AvatarHistoryViewer({
  room,
  userId,
  includeRoom,
  onClose,
}: AvatarHistoryViewerProps) {
  const history = useAvatarHistory(room, userId, !!includeRoom);
  const name = userId
    ? getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId
    : room.name;

  const items = useMemo(() => {
    const list: ViewerItem[] = [];
    history.member.forEach((e, i) =>
      list.push(toItem(e, i, `${name} · profile picture`, userId ?? ''))
    );
    history.room.forEach((e, i) =>
      list.push(
        toItem(e, i, userId ? `Chat picture (${room.name})` : `${room.name} · chat picture`, '')
      )
    );
    return list;
  }, [history.member, history.room, name, userId, room.name]);

  const { index, setIndex } = useStableIndex(items);

  const notes: string[] = [];
  if (!history.loading) {
    if (items.length === 1) notes.push('Only the current picture is known in this chat.');
    if (!history.complete) notes.push('Older pictures may exist further back.');
    if (history.error) notes.push(`Could not load the history (${history.error}).`);
  }
  notes.push(
    'Pictures as this chat saw them: Matrix keeps no history of profile pictures outside a chat.'
  );

  return (
    <MediaViewer
      items={items}
      index={index >= 0 ? index : 0}
      onIndexChange={setIndex}
      onClose={onClose}
      loading={history.loading}
      moreAfter={history.loading}
      label={`Profile pictures of ${name}`}
      banner={<span data-avatar-history-note>{notes.join(' ')}</span>}
      emptyText={history.loading ? undefined : 'No picture is set.'}
      roundThumbs
    />
  );
}
