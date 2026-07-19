import { useEffect, useState } from 'react';

export const useSecondsCountdown = (seconds: number, onEnd?: () => void): number => {
  const [countdown, setCountdown] = useState(seconds);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (countdown <= 1) {
        onEnd?.();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [countdown, onEnd]);

  return countdown;
};
