import { RefObject, useCallback } from 'react';
import { getResizeObserverEntry, useResizeObserver } from './useResizeObserver';

export const useElementSizeObserver = <T extends Element>(
  elementRef: RefObject<T>,
  onResize: (width: number, height: number, element: T) => void
) => {
  useResizeObserver(
    useCallback(
      (entries) => {
        const target = elementRef.current;
        if (!target) return;
        const targetEntry = getResizeObserverEntry(target, entries);
        if (targetEntry) {
          const { width, height } = targetEntry.contentRect;
          onResize(width, height, target);
        }
      },
      [elementRef, onResize]
    ),
    useCallback(() => elementRef.current, [elementRef])
  );
};
