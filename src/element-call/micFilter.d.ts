export function disguiseTrack(
  output: MediaStreamTrack,
  source: MediaStreamTrack,
  onStop: () => void
): MediaStreamTrack;

export function wrapGetUserMedia(
  mediaDevices: Pick<MediaDevices, 'getUserMedia'>,
  filter: (mic: MediaStreamTrack) => Promise<MediaStreamTrack>,
  isEnabled: () => boolean,
  log?: Pick<Console, 'warn'>
): void;

export function noiseSuppressionEnabled(storage: Pick<Storage, 'getItem'>): boolean;
