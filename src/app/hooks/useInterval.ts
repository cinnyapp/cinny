import { useEffect, useMemo } from 'react';

export type IntervalCallback = () => void;

/**
 * @param callback interval callback.
 * @param ms interval time in milliseconds. negative value will stop the interval.
 * @returns interval id or undefined if not running.
 */
export const useInterval = (callback: IntervalCallback, ms: number): number | undefined => {
  const id = useMemo(() => {
    if (ms < 0) return undefined;
    return window.setInterval(callback, ms);
  }, [callback, ms]);

  useEffect(
    () => () => {
      window.clearInterval(id);
    },
    [id]
  );

  return id;
};
