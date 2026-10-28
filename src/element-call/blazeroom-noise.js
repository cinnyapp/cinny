// Loaded by Element Call's index.html before its own script (see vite.config.js): sends the
// call mic through RNNoise. The files it imports are copied next to it at build time.
import { loadRnnoise, RnnoiseWorkletNode } from './noise-suppressor.js';
import { disguiseTrack, noiseSuppressionEnabled, wrapGetUserMedia } from './micFilter.js';

const base = new URL('./', import.meta.url);
let wasmBinary;

const rnnoise = async (mic) => {
  // RNNoise works on 48 kHz audio.
  const context = new AudioContext({ sampleRate: 48000 });
  try {
    wasmBinary ??= await loadRnnoise({
      url: new URL('rnnoise.wasm', base).href,
      simdUrl: new URL('rnnoise_simd.wasm', base).href,
    });
    await context.audioWorklet.addModule(new URL('rnnoiseWorklet.js', base).href);

    const source = context.createMediaStreamSource(new MediaStream([mic]));
    const denoiser = new RnnoiseWorkletNode(context, { maxChannels: 1, wasmBinary });
    const destination = context.createMediaStreamDestination();
    source.connect(denoiser).connect(destination);
    await context.resume();

    const [output] = destination.stream.getAudioTracks();
    return disguiseTrack(output, mic, () => {
      denoiser.destroy();
      context.close();
    });
  } catch (e) {
    context.close();
    throw e;
  }
};

if (navigator.mediaDevices?.getUserMedia && window.AudioWorkletNode) {
  wrapGetUserMedia(navigator.mediaDevices, rnnoise, () => noiseSuppressionEnabled(localStorage));
}
