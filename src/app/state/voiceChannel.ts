import { atom } from 'jotai';
import type { Room as LKRoom, LocalParticipant, RemoteParticipant } from 'livekit-client';

export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type VoiceChannelSession = {
  roomId: string;
  livekitRoom: LKRoom;
  connectionState: VoiceConnectionState;
  isMicMuted: boolean;
  isCamEnabled: boolean;
  isScreensharing: boolean;
};

// The active voice session (null when not in any voice channel)
export const voiceSessionAtom = atom<VoiceChannelSession | null>(null);

// Map of roomId -> list of Matrix userIds currently in voice
export const voiceMembersAtom = atom<Map<string, string[]>>(new Map());
