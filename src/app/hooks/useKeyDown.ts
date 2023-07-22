import { useEffect } from 'react';

export const useKeyDown = (target: Window, callback: (evt: KeyboardEvent) => void) => {
  useEffect(() => {
    target.addEventListener('keydown', callback);
    return () => {
      target.removeEventListener('keydown', callback);
    };
  }, [target, callback]);
};
