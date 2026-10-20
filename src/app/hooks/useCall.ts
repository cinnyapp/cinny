import { Room } from 'matrix-js-sdk';
import {
  MatrixRTCSession,
  MatrixRTCSessionEvent,
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

export const useCallMembers = (room: Room, session: MatrixRTCSession): CallMembership[] => {
  const [memberships, setMemberships] = useState<CallMembership[]>(
    MatrixRTCSession.sessionMembershipsForRoom(room, session.sessionDescription)
  );

  useEffect(() => {
    const updateMemberships = () => {
      setMemberships(MatrixRTCSession.sessionMembershipsForRoom(room, session.sessionDescription));
    };

    updateMemberships();

    session.on(MatrixRTCSessionEvent.MembershipsChanged, updateMemberships);
    return () => {
      session.removeListener(MatrixRTCSessionEvent.MembershipsChanged, updateMemberships);
    };
  }, [session, room]);

  return memberships;
};

export const useCallMembersChange = (session: MatrixRTCSession, callback: () => void): void => {
  useEffect(() => {
    session.on(MatrixRTCSessionEvent.MembershipsChanged, callback);
    return () => {
      session.removeListener(MatrixRTCSessionEvent.MembershipsChanged, callback);
    };
  }, [session, callback]);
};
