import { useEffect } from 'react';

export const useDocumentVisibilityChange = (onChange: (visible: boolean) => void) => {
  useEffect(() => {
    const handleChange = () => {
      onChange(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleChange);
    return () => {
      document.removeEventListener('visibilitychange', handleChange);
    };
  }, [onChange]);
};
