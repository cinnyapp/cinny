import { atom } from 'jotai';

export type VoiceParticipant = {
  userId: string;
  identity: string;
  name?: string;
  isSpeaking: boolean;
  isMuted: boolean;
  hasVideo: boolean;
  hasScreenShare: boolean;
};

export type ActiveVoiceRoom = {
  roomId: string;
  token: string;
  serverUrl: string;
};

export const activeVoiceRoomAtom = atom<ActiveVoiceRoom | null>(null);

export const voiceParticipantsAtom = atom<Map<string, VoiceParticipant>>(new Map());
