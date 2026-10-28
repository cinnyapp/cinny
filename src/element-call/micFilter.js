// Runs inside the bundled Element Call page (public/element-call), which is served as-is, so
// this is plain browser JavaScript with no imports.

// Wraps an audio track coming out of a filter so it still looks like the mic it came from:
// Element Call and LiveKit read the device from getSettings(), and stopping or muting it must
// reach the real mic.
export const disguiseTrack = (output, source, onStop) => {
  const stopOutput = output.stop.bind(output);
  const outputSettings = output.getSettings.bind(output);
  let stopped = false;
  const stopAll = () => {
    if (stopped) return;
    stopped = true;
    stopOutput();
    source.stop();
    onStop();
  };

  Object.defineProperties(output, {
    label: { get: () => source.label },
    enabled: {
      get: () => source.enabled,
      set: (value) => {
        // eslint-disable-next-line no-param-reassign
        source.enabled = value;
      },
    },
    getSettings: { value: () => ({ ...outputSettings(), ...source.getSettings() }) },
    getConstraints: { value: () => source.getConstraints() },
    getCapabilities: { value: () => source.getCapabilities?.() ?? {} },
    applyConstraints: { value: (constraints) => source.applyConstraints(constraints) },
    stop: { value: stopAll },
  });
  source.addEventListener('ended', () => {
    if (stopped) return;
    stopAll();
    output.dispatchEvent(new Event('ended'));
  });
  return output;
};

// Replaces mediaDevices.getUserMedia so every mic stream goes through `filter(track)`, which
// resolves to a filtered track. Video and screen share are untouched. If the filter fails the
// raw mic is used, so a call never breaks because of it.
export const wrapGetUserMedia = (mediaDevices, filter, isEnabled, log = console) => {
  const getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);

  // eslint-disable-next-line no-param-reassign
  mediaDevices.getUserMedia = async (constraints) => {
    const stream = await getUserMedia(constraints);
    const [mic] = stream.getAudioTracks();
    if (!constraints?.audio || !mic || !isEnabled()) return stream;

    try {
      const filtered = await filter(mic);
      return new MediaStream([...stream.getVideoTracks(), filtered]);
    } catch (e) {
      log.warn('[blazeroom] Noise suppression unavailable, using the raw mic', e);
      return stream;
    }
  };
};

// Whether the "Noise suppression" setting is on; Cinny keeps its settings in localStorage
// under "settings", on the same origin as this page. On by default.
export const noiseSuppressionEnabled = (storage) => {
  try {
    const settings = JSON.parse(storage.getItem('settings') ?? '{}');
    return settings?.callNoiseSuppression !== false;
  } catch {
    return true;
  }
};
