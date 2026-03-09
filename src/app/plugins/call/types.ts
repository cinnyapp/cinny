export enum ElementCallIntent {
  StartCall = 'start_call',
  JoinExisting = 'join_existing',
  StartCallDM = 'start_call_dm',
  JoinExistingDM = 'join_existing_dm',
  StartCallDMVoice = 'start_call_dm_voice',
  JoinExistingDMVoice = 'join_existing_dm_voice',
}

export type ElementCallThemeKind = 'light' | 'dark';

export type ElementMediaStatePayload = {
  audio_enabled?: boolean;
  video_enabled?: boolean;
};
export type ElementMediaStateDetail = {
  data?: ElementMediaStatePayload;
};

export enum ElementWidgetActions {
  JoinCall = 'io.element.join',
  HangupCall = 'im.vector.hangup',
  Close = 'io.element.close',
  DeviceMute = 'io.element.device_mute',
}
