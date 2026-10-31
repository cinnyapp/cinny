import React, { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { mediaViewerAtom, useCloseMediaViewer } from './state';
import { RoomMediaViewer } from './RoomMediaViewer';
import { AvatarHistoryViewer } from '../profile-avatar-history/AvatarHistoryViewer';

/** Mounted once in the client root; shows the viewer requested via `useOpenMediaViewer`. */
export function MediaViewerRenderer() {
  const req = useAtomValue(mediaViewerAtom);
  const close = useCloseMediaViewer();
  const mx = useMatrixClient();
  const room = req ? mx.getRoom(req.roomId) : null;

  useEffect(() => {
    if (req && !room) close();
  }, [req, room, close]);

  if (!req || !room) return null;
  if (req.mode === 'room') {
    return (
      <RoomMediaViewer
        key={`${req.roomId}|${req.eventId}`}
        room={room}
        eventId={req.eventId}
        walkerKey={req.walkerKey}
        onClose={close}
      />
    );
  }
  return (
    <AvatarHistoryViewer
      key={`${req.roomId}|${req.userId ?? ''}`}
      room={room}
      userId={req.userId}
      includeRoom={req.includeRoom}
      onClose={close}
    />
  );
}
