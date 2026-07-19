import { useEffect } from 'react';

export const useNetworkOnlineCallback = (callback: () => void) => {
  useEffect(() => {
    const handleNetwork = () => callback();

    window.addEventListener('online', handleNetwork);
    return () => {
      window.removeEventListener('online', handleNetwork);
    };
  }, [callback]);
};

export const useNetworkOfflineCallback = (callback: () => void) => {
  useEffect(() => {
    const handleNetwork = () => callback();

    window.addEventListener('offline', handleNetwork);
    return () => {
      window.removeEventListener('offline', handleNetwork);
    };
  }, [callback]);
};
