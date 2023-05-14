import { useCallback, useRef } from 'react';

interface DebounceOptions {
  wait?: number;
  immediate?: boolean;
}

export function useDebounce<T extends unknown[]>(
  callback: (...args: T) => void,
  options?: DebounceOptions
): (...args: T) => void {
  const timeoutIdRef = useRef<number | null>(null);
  const { wait, immediate } = options ?? {};

  const debounceCallback = useCallback(
    (...cbArgs: T) => {
      if (timeoutIdRef.current !== null) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      } else if (immediate) {
        callback(...cbArgs);
      }

      timeoutIdRef.current = window.setTimeout(() => {
        callback(...cbArgs);
        timeoutIdRef.current = null;
      }, wait);
    },
    [callback, wait, immediate]
  );

  return debounceCallback;
}
