/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback, useEffect, useRef } from 'react';

export function useSound(sound: string) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    let cancelled = false;

    fetch(sound)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load sound: ${sound}`);
        }

        return response.arrayBuffer();
      })
      .then((buffer) => audioContext.decodeAudioData(buffer))
      .then((decodedBuffer) => {
        if (!cancelled) {
          audioBufferRef.current = decodedBuffer;
        }
      })
      .catch((error) => {
        console.error('Failed to load sound:', error);
      });

    return () => {
      cancelled = true;
      audioBufferRef.current = null;
      audioContextRef.current = null;
      audioContext.close();
    };
  }, [sound]);

  const play = useCallback(() => {
    const audioContext = audioContextRef.current;
    const audioBuffer = audioBufferRef.current;

    if (!audioContext || !audioBuffer) return;

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  }, []);

  return { play };
}
