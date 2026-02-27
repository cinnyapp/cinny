// Matrix state event types for voice/RTC
export const CALL_MEMBER_EVENT_TYPE = 'org.matrix.msc3401.call.member';
export const RTC_FOCI_EVENT_TYPE = 'org.matrix.msc4143.rtc_foci';

// The call_id for the room-wide voice channel (empty string = room-level call)
export const ROOM_VOICE_CALL_ID = '';

export type LkFocus = {
  type: 'livekit';
  livekit_alias: string;
};

export type RtcFociContent = {
  foci: LkFocus[];
  livekit_service_url?: string;
};

export type CallMemberContent = {
  application: 'm.call';
  call_id: string;
  device_id: string;
  foci_active: LkFocus[];
  created_ts: number;
  expires?: number;
};
