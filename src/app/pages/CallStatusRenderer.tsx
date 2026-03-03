import React from 'react';
import { CallStatus } from '../features/call-status';
import { useCallState } from './client/call/CallProvider';
import { useMatrixClient } from '../hooks/useMatrixClient';

export function CallStatusRenderer() {
  const mx = useMatrixClient();
  const callState = useCallState();

  const roomId = callState.activeCallRoomId;

  const room = roomId && mx.getRoom(roomId);

  if (!room) return null;

  return <CallStatus room={room} />;
}
