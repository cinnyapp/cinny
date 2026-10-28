import { describe, expect, it, vi } from 'vitest';
import { disguiseTrack, noiseSuppressionEnabled, wrapGetUserMedia } from './micFilter';

const fakeTrack = (kind: string, label = '', settings = {}) =>
  Object.assign(new EventTarget(), {
    kind,
    label,
    enabled: true,
    stopped: false,
    stop() {
      this.stopped = true;
    },
    getSettings: () => settings,
    getConstraints: () => ({ deviceId: 'mic-1' }),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  });
type FakeTrack = ReturnType<typeof fakeTrack>;

type FakeStream = { getAudioTracks: () => FakeTrack[]; getVideoTracks: () => FakeTrack[] };
const fakeStream = (tracks: FakeTrack[]): FakeStream => ({
  getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
  getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
});

// `new MediaStream(tracks)` in the code under test returns a fake stream.
function FakeMediaStream(tracks: FakeTrack[]) {
  return fakeStream(tracks);
}

vi.stubGlobal('MediaStream', FakeMediaStream);

const track = (t: FakeTrack) => t as unknown as MediaStreamTrack;

describe('disguiseTrack', () => {
  const setup = () => {
    const mic = fakeTrack('audio', 'USB Mic', { deviceId: 'mic-1', groupId: 'g' });
    const output = fakeTrack('audio', 'MediaStreamAudioDestinationNode', { sampleRate: 48000 });
    const onStop = vi.fn();
    disguiseTrack(track(output), track(mic), onStop);
    return { mic, output, onStop };
  };

  it('reports the mic label and device', () => {
    const { output } = setup();
    expect(output.label).toBe('USB Mic');
    expect(output.getSettings()).toEqual({ sampleRate: 48000, deviceId: 'mic-1', groupId: 'g' });
    expect(output.getConstraints()).toEqual({ deviceId: 'mic-1' });
  });

  it('mutes the real mic', () => {
    const { mic, output } = setup();
    output.enabled = false;
    expect(mic.enabled).toBe(false);
  });

  it('stops the mic and the filter once', () => {
    const { mic, output, onStop } = setup();
    output.stop();
    output.stop();
    expect(mic.stopped).toBe(true);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('ends when the mic ends, e.g. it was unplugged', () => {
    const { mic, output, onStop } = setup();
    const ended = vi.fn();
    output.addEventListener('ended', ended);
    mic.dispatchEvent(new Event('ended'));
    expect(ended).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});

describe('wrapGetUserMedia', () => {
  const setup = (enabled: boolean, filter = vi.fn()) => {
    const mic = fakeTrack('audio');
    const camera = fakeTrack('video');
    const raw = fakeStream([mic, camera]);
    const mediaDevices = { getUserMedia: vi.fn().mockResolvedValue(raw) };
    const log = { warn: vi.fn() };
    wrapGetUserMedia(mediaDevices, filter, () => enabled, log);
    return { mediaDevices, raw, mic, camera, filter, log };
  };

  it('replaces the mic with the filtered track and keeps the video', async () => {
    const filtered = fakeTrack('audio');
    const { mediaDevices, camera, mic, filter } = setup(true, vi.fn().mockResolvedValue(filtered));

    const stream = (await mediaDevices.getUserMedia({ audio: true, video: true })) as FakeStream;

    expect(filter).toHaveBeenCalledWith(mic);
    expect(stream.getAudioTracks()).toEqual([filtered]);
    expect(stream.getVideoTracks()).toEqual([camera]);
  });

  it('leaves the stream alone when the setting is off or there is no audio', async () => {
    const off = setup(false);
    expect(await off.mediaDevices.getUserMedia({ audio: true })).toBe(off.raw);
    expect(off.filter).not.toHaveBeenCalled();

    const video = setup(true);
    expect(await video.mediaDevices.getUserMedia({ video: true })).toBe(video.raw);
    expect(video.filter).not.toHaveBeenCalled();
  });

  it('falls back to the raw mic when the filter fails', async () => {
    const { mediaDevices, raw, log } = setup(true, vi.fn().mockRejectedValue(new Error('no wasm')));
    expect(await mediaDevices.getUserMedia({ audio: true })).toBe(raw);
    expect(log.warn).toHaveBeenCalled();
  });
});

describe('noiseSuppressionEnabled', () => {
  const storage = (value: string | null) => ({ getItem: () => value });

  it('is on unless the setting is turned off', () => {
    expect(noiseSuppressionEnabled(storage(null))).toBe(true);
    expect(noiseSuppressionEnabled(storage('{"callNoiseSuppression":true}'))).toBe(true);
    expect(noiseSuppressionEnabled(storage('{"callNoiseSuppression":false}'))).toBe(false);
    expect(noiseSuppressionEnabled(storage('not json'))).toBe(true);
  });
});
