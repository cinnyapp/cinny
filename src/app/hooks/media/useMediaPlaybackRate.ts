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
