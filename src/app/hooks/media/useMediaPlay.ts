import { useCallback, useEffect, useState } from 'react';

export type MediaPlayData = {
  playing: boolean;
};

export type MediaPlayControl = {
  setPlaying: (play: boolean) => void;
};

export const useMediaPlay = (
  getTargetElement: () => HTMLMediaElement | null
): MediaPlayData & MediaPlayControl => {
  const [playing, setPlay] = useState(false);

  const setPlaying = useCallback(
    (play: boolean) => {
      const targetEl = getTargetElement();
      if (!targetEl) return;
      if (play) targetEl.play();
      else targetEl.pause();
    },
    [getTargetElement]
  );

  useEffect(() => {
    const targetEl = getTargetElement();
    const handleChange = () => {
      if (!targetEl) return;
      setPlay(targetEl.paused === false);
    };
    targetEl?.addEventListener('playing', handleChange);
    targetEl?.addEventListener('play', handleChange);
    targetEl?.addEventListener('pause', handleChange);
    return () => {
      targetEl?.removeEventListener('playing', handleChange);
      targetEl?.removeEventListener('play', handleChange);
      targetEl?.removeEventListener('pause', handleChange);
    };
  }, [getTargetElement]);

  return {
    playing,
    setPlaying,
  };
};
