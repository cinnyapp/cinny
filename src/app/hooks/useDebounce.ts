import { useCallback, useRef } from 'react';

export interface DebounceOptions {
  wait?: number;
  immediate?: boolean;
}
export type DebounceCallback<T extends unknown[]> = (...args: T) => void;

export function useDebounce<T extends unknown[]>(
  callback: DebounceCallback<T>,
  options?: DebounceOptions
): DebounceCallback<T> {
  const timeoutIdRef = useRef<number>();
  const { wait, immediate } = options ?? {};

  const debounceCallback = useCallback(
    (...cbArgs: T) => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = undefined;
      } else if (immediate) {
        callback(...cbArgs);
      }

      timeoutIdRef.current = window.setTimeout(() => {
        callback(...cbArgs);
        timeoutIdRef.current = undefined;
      }, wait);
    },
    [callback, wait, immediate]
  );

  return debounceCallback;
}
