import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  Room as LKRoom,
  RoomEvent,
  RoomOptions,
  VideoPresets,
} from 'livekit-client';
import { RoomStateEvent, MatrixEvent } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { voiceSessionAtom, voiceMembersAtom } from '../../state/voiceChannel';
import { fetchLkJwt } from './lkJwtService';
import {
  CALL_MEMBER_EVENT_TYPE,
  ROOM_VOICE_CALL_ID,
  RTC_FOCI_EVENT_TYPE,
  type CallMemberContent,
  type RtcFociContent,
} from './voiceConstants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoiceActions = {
  joinVoice: (roomId: string, enableVideo?: boolean) => Promise<void>;
  leaveVoice: () => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreenshare: () => Promise<void>;
};

const VoiceActionsContext = createContext<VoiceActions | null>(null);

export function useVoiceActions(): VoiceActions {
  const ctx = useContext(VoiceActionsContext);
  if (!ctx) throw new Error('useVoiceActions must be used inside VoiceChannelProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLkServiceUrl(
  mx: ReturnType<typeof useMatrixClient>,
  roomId: string,
  globalServiceUrl?: string
): string | undefined {
  const room = mx.getRoom(roomId);
  const fociEvent = room?.currentState.getStateEvents(RTC_FOCI_EVENT_TYPE, '');
  if (fociEvent) {
    const content = fociEvent.getContent<RtcFociContent>();
    if (content.livekit_service_url) return content.livekit_service_url;
  }
  return globalServiceUrl;
}

async function publishCallMember(
  mx: ReturnType<typeof useMatrixClient>,
  roomId: string,
  livekitAlias: string,
  leave = false
): Promise<void> {
  const deviceId = mx.getDeviceId() ?? 'UNKNOWN';
  const userId = mx.getSafeUserId();
  const stateKey = `_${userId}_NATIVE_DEVICE`;

  const content = leave
    ? {}
    : ({
        application: 'm.call',
        call_id: ROOM_VOICE_CALL_ID,
        device_id: deviceId,
        foci_active: [{ type: 'livekit', livekit_alias: livekitAlias }],
        created_ts: Date.now(),
        expires: 3_600_000,
      } satisfies CallMemberContent);

  await mx.sendStateEvent(roomId, CALL_MEMBER_EVENT_TYPE, content, stateKey);
}

function readVoiceMembers(
  mx: ReturnType<typeof useMatrixClient>,
  roomId: string
): string[] {
  const room = mx.getRoom(roomId);
  if (!room) return [];

  const events = room.currentState.getStateEvents(CALL_MEMBER_EVENT_TYPE);
  const now = Date.now();

  return events
    .filter((ev) => {
      const c = ev.getContent<CallMemberContent>();
      if (c.application !== 'm.call') return false;
      if (c.call_id !== ROOM_VOICE_CALL_ID) return false;
      if (typeof c.created_ts === 'number' && typeof c.expires === 'number') {
        if (c.created_ts + c.expires < now) return false;
      }
      return Array.isArray(c.foci_active) && c.foci_active.length > 0;
    })
    .map((ev) => {
      // State key: `_@user:server_NATIVE_DEVICE`
      const key = ev.getStateKey() ?? '';
      return key.replace(/^_/, '').replace(/_NATIVE_DEVICE$/, '');
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type Props = {
  children: ReactNode;
  /** URL of the lk-jwt-service, e.g. "https://lk-jwt-service.example.com" */
  lkJwtServiceUrl?: string;
};

export function VoiceChannelProvider({ children, lkJwtServiceUrl }: Props) {
  const mx = useMatrixClient();
  const [voiceSession, setVoiceSession] = useAtom(voiceSessionAtom);
  const setVoiceMembers = useSetAtom(voiceMembersAtom);
  const livekitRoomRef = useRef<LKRoom | null>(null);
  const voiceSessionRef = useRef(voiceSession);
  voiceSessionRef.current = voiceSession;

  // ---- Voice member tracking ----

  const refreshVoiceMembers = useCallback(() => {
    const rooms = mx.getRooms();
    const map = new Map<string, string[]>();
    rooms.forEach((room) => {
      const members = readVoiceMembers(mx, room.roomId);
      if (members.length > 0) map.set(room.roomId, members);
    });
    setVoiceMembers(map);
  }, [mx, setVoiceMembers]);

  useEffect(() => {
    refreshVoiceMembers();

    const handleStateEvent = (event: MatrixEvent) => {
      if (event.getType() === CALL_MEMBER_EVENT_TYPE) refreshVoiceMembers();
    };

    mx.on(RoomStateEvent.Events, handleStateEvent);
    return () => {
      mx.removeListener(RoomStateEvent.Events, handleStateEvent);
    };
  }, [mx, refreshVoiceMembers]);

  // ---- LiveKit connection management ----

  const joinVoice = useCallback(
    async (roomId: string, enableVideo = false) => {
      // Disconnect from any existing session
      if (livekitRoomRef.current) {
        await livekitRoomRef.current.disconnect();
        livekitRoomRef.current = null;
      }

      const serviceUrl = getLkServiceUrl(mx, roomId, lkJwtServiceUrl);
      if (!serviceUrl) {
        throw new Error(
          'No lk-jwt-service URL configured. Add "lkJwtServiceUrl" to config.json ' +
            'or set the room\'s org.matrix.msc4143.rtc_foci state event.'
        );
      }

      const deviceId = mx.getDeviceId() ?? 'UNKNOWN';
      const matrixToken = mx.getAccessToken() ?? '';

      const { url: livekitUrl, jwt } = await fetchLkJwt(serviceUrl, roomId, deviceId, matrixToken);

      const options: RoomOptions = {
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
      };

      const lkRoom = new LKRoom(options);
      livekitRoomRef.current = lkRoom;

      setVoiceSession({
        roomId,
        livekitRoom: lkRoom,
        connectionState: 'connecting',
        isMicMuted: false,
        isCamEnabled: enableVideo,
        isScreensharing: false,
      });

      // Refresh UI on any participant/track change
      const triggerUpdate = () =>
        setVoiceSession((prev) => (prev ? { ...prev } : prev));

      lkRoom.on(RoomEvent.ParticipantConnected, triggerUpdate);
      lkRoom.on(RoomEvent.ParticipantDisconnected, triggerUpdate);
      lkRoom.on(RoomEvent.TrackSubscribed, triggerUpdate);
      lkRoom.on(RoomEvent.TrackUnsubscribed, triggerUpdate);
      lkRoom.on(RoomEvent.LocalTrackPublished, triggerUpdate);
      lkRoom.on(RoomEvent.LocalTrackUnpublished, triggerUpdate);

      lkRoom.on(RoomEvent.Disconnected, () => {
        setVoiceSession(null);
        livekitRoomRef.current = null;
        publishCallMember(mx, roomId, roomId, true).catch(console.warn);
        refreshVoiceMembers();
      });

      await lkRoom.connect(livekitUrl, jwt);
      await lkRoom.localParticipant.setMicrophoneEnabled(true);
      if (enableVideo) await lkRoom.localParticipant.setCameraEnabled(true);

      await publishCallMember(mx, roomId, roomId);
      refreshVoiceMembers();

      setVoiceSession((prev) =>
        prev ? { ...prev, connectionState: 'connected' } : prev
      );
    },
    [mx, lkJwtServiceUrl, setVoiceSession, refreshVoiceMembers]
  );

  const leaveVoice = useCallback(async () => {
    const roomId = voiceSessionRef.current?.roomId;
    if (livekitRoomRef.current) {
      await livekitRoomRef.current.disconnect();
      livekitRoomRef.current = null;
    }
    setVoiceSession(null);
    if (roomId) {
      await publishCallMember(mx, roomId, roomId, true).catch(console.warn);
      refreshVoiceMembers();
    }
  }, [mx, setVoiceSession, refreshVoiceMembers]);

  const toggleMic = useCallback(async () => {
    const session = voiceSessionRef.current;
    if (!livekitRoomRef.current || !session) return;
    const muted = !session.isMicMuted;
    await livekitRoomRef.current.localParticipant.setMicrophoneEnabled(!muted);
    setVoiceSession((prev) => (prev ? { ...prev, isMicMuted: muted } : prev));
  }, [setVoiceSession]);

  const toggleCamera = useCallback(async () => {
    const session = voiceSessionRef.current;
    if (!livekitRoomRef.current || !session) return;
    const enabled = !session.isCamEnabled;
    await livekitRoomRef.current.localParticipant.setCameraEnabled(enabled);
    setVoiceSession((prev) => (prev ? { ...prev, isCamEnabled: enabled } : prev));
  }, [setVoiceSession]);

  const toggleScreenshare = useCallback(async () => {
    const session = voiceSessionRef.current;
    if (!livekitRoomRef.current || !session) return;
    const enabled = !session.isScreensharing;
    await livekitRoomRef.current.localParticipant.setScreenShareEnabled(enabled);
    setVoiceSession((prev) => (prev ? { ...prev, isScreensharing: enabled } : prev));
  }, [setVoiceSession]);

  const actions: VoiceActions = {
    joinVoice,
    leaveVoice,
    toggleMic,
    toggleCamera,
    toggleScreenshare,
  };

  return (
    <VoiceActionsContext.Provider value={actions}>{children}</VoiceActionsContext.Provider>
  );
}
