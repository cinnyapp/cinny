import { useCallback, useEffect, useState } from 'react';

export type MediaVolumeData = {
  volume: number;
  mute: boolean;
};

export type MediaVolumeControl = {
  setMute: (mute: boolean) => void;
  setVolume: (volume: number) => void;
};

export const useMediaVolume = (
  getTargetElement: () => HTMLMediaElement | null
): MediaVolumeData & MediaVolumeControl => {
  const [volumeData, setVolumeData] = useState<MediaVolumeData>({
    volume: 1,
    mute: false,
  });

  const setMute = useCallback(
    (mute: boolean) => {
      const targetEl = getTargetElement();
      if (!targetEl) return;
      targetEl.muted = mute;
    },
    [getTargetElement]
  );

  const setVolume = useCallback(
    (volume: number) => {
      const targetEl = getTargetElement();
      if (!targetEl) return;
      targetEl.volume = volume;
    },
    [getTargetElement]
  );

  useEffect(() => {
    const targetEl = getTargetElement();
    const handleChange = () => {
      if (!targetEl) return;

      setVolumeData({
        mute: targetEl.muted,
        volume: Math.max(0, Math.min(targetEl.volume, 1)),
      });
    };
    targetEl?.addEventListener('volumechange', handleChange);
    return () => {
      targetEl?.removeEventListener('volumechange', handleChange);
    };
  }, [getTargetElement]);

  return {
    ...volumeData,
    setMute,
    setVolume,
  };
};
