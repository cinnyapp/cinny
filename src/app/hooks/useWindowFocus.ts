import { useEffect, useState } from 'react';

/**
 * Tracks whether the browser window currently has focus.
 */
export const useWindowFocus = (): boolean => {
  const [focused, setFocused] = useState<boolean>(() => document.hasFocus());

  useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return focused;
};
