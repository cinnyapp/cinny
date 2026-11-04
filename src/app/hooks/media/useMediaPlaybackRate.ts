/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback, useEffect, useState } from 'react';

export type MediaPlaybackRateData = {
  playbackRate: number;
};
export type MediaPlaybackRateControl = {
  setPlaybackRate: (rate: number) => void;
};

export const useMediaPlaybackRate = (
  getTargetElement: () => HTMLMediaElement | null
): MediaPlaybackRateData & MediaPlaybackRateControl => {
  const [rate, setRate] = useState(1.0);

  const setPlaybackRate = useCallback(
    (playbackRate: number) => {
      const targetEl = getTargetElement();
      if (!targetEl) return;
      targetEl.playbackRate = playbackRate;
    },
    [getTargetElement]
  );

  useEffect(() => {
    const targetEl = getTargetElement();
    const handleChange = () => {
      if (!targetEl) return;
      setRate(targetEl.playbackRate);
    };
    targetEl?.addEventListener('ratechange', handleChange);
    return () => {
      targetEl?.removeEventListener('ratechange', handleChange);
    };
  }, [getTargetElement]);

  return {
    playbackRate: rate,
    setPlaybackRate,
  };
};
