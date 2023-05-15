import { useCallback, useRef } from 'react';

export interface ThrottleOptions {
  wait?: number;
  immediate?: boolean;
}

export type ThrottleCallback<T extends unknown[]> = (...args: T) => void;

export function useThrottle<T extends unknown[]>(
  callback: ThrottleCallback<T>,
  options?: ThrottleOptions
): ThrottleCallback<T> {
  const timeoutIdRef = useRef<number>();
  const argsRef = useRef<T>();
  const { wait, immediate } = options ?? {};

  const debounceCallback = useCallback(
    (...cbArgs: T) => {
      argsRef.current = cbArgs;

      if (timeoutIdRef.current) {
        return;
      }
      if (immediate) {
        callback(...cbArgs);
      }

      timeoutIdRef.current = window.setTimeout(() => {
        if (argsRef.current) {
          callback(...argsRef.current);
        }
        argsRef.current = undefined;
        timeoutIdRef.current = undefined;
      }, wait);
    },
    [callback, wait, immediate]
  );

  return debounceCallback;
}
