import { useEffect, useState } from 'react';

export type MediaLoadingData = {
  loading: boolean;
  error: boolean;
};

export const useMediaLoading = (
  getTargetElement: () => HTMLMediaElement | null
): MediaLoadingData => {
  const [loadingData, setLoadingData] = useState<MediaLoadingData>({
    loading: false,
    error: false,
  });

  useEffect(() => {
    const targetEl = getTargetElement();
    const handleStart = () => {
      setLoadingData({
        loading: true,
        error: false,
      });
    };
    const handleStop = () => {
      setLoadingData({
        loading: false,
        error: false,
      });
    };
    const handleError = () => {
      setLoadingData({
        loading: false,
        error: true,
      });
    };
    targetEl?.addEventListener('loadstart', handleStart);
    targetEl?.addEventListener('loadeddata', handleStop);
    targetEl?.addEventListener('stalled', handleStop);
    targetEl?.addEventListener('suspend', handleStop);
    targetEl?.addEventListener('error', handleError);
    return () => {
      targetEl?.removeEventListener('loadstart', handleStart);
      targetEl?.removeEventListener('loadeddata', handleStop);
      targetEl?.removeEventListener('stalled', handleStop);
      targetEl?.removeEventListener('suspend', handleStop);
      targetEl?.removeEventListener('error', handleError);
    };
  }, [getTargetElement]);

  return loadingData;
};
