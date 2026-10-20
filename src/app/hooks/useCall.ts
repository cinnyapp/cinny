import { Room } from 'matrix-js-sdk';
import {
  MatrixRTCSession,
  MatrixRTCSessionEvent,
  MatrixRTCSessionEventHandlerMap,
} from 'matrix-js-sdk/lib/matrixrtc/MatrixRTCSession';
import { CallMembership } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import { useEffect, useState } from 'react';
import { MatrixRTCSessionManagerEvents } from 'matrix-js-sdk/lib/matrixrtc/MatrixRTCSessionManager';
import { useMatrixClient } from './useMatrixClient';
import { SessionEventEmitter, subscribeRoomCallSession } from '../utils/callSessionSubscription';

const SESSION_EVENTS = [
  MatrixRTCSessionManagerEvents.SessionStarted,
  MatrixRTCSessionManagerEvents.SessionEnded,
] as const;

export const useCallSession = (room: Room): MatrixRTCSession => {
  const mx = useMatrixClient();

  const [session, setSession] = useState(mx.matrixRTC.getRoomSession(room));

  useEffect(() => {
    // The room may have changed since the initial state was taken.
    setSession(mx.matrixRTC.getRoomSession(room));
    // One shared subscription per client (not one per room row) - see
    // callSessionSubscription.ts for why.
    return subscribeRoomCallSession(
      mx.matrixRTC as unknown as SessionEventEmitter,
      SESSION_EVENTS,
      room.roomId,
      () => setSession(mx.matrixRTC.getRoomSession(room))
    );
  }, [mx, room]);

  return session;
};

export const useCallMembersChange = (
  session: MatrixRTCSession,
  callback: (members: CallMembership[]) => void
): void => {
  useEffect(() => {
    const handleMembershipsChange: MatrixRTCSessionEventHandlerMap[MatrixRTCSessionEvent.MembershipsChanged] =
      (oldestMembership, newMemberships) => {
        callback(newMemberships);
      };

    session.on(MatrixRTCSessionEvent.MembershipsChanged, handleMembershipsChange);
    return () => {
      session.removeListener(MatrixRTCSessionEvent.MembershipsChanged, handleMembershipsChange);
    };
  }, [session, callback]);
};

export const useCallMembers = (session: MatrixRTCSession): CallMembership[] => {
  const [memberships, setMemberships] = useState<CallMembership[]>(session.memberships);

  useCallMembersChange(session, setMemberships);

  return memberships;
};
