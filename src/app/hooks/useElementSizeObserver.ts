import { useCallback } from 'react';
import { getResizeObserverEntry, useResizeObserver } from './useResizeObserver';

export const useElementSizeObserver = <T extends Element>(
  element: () => T | null,
  onResize: (width: number, height: number, element: T) => void
) => {
  useResizeObserver(
    useCallback(
      (entries) => {
        const target = element();
        if (!target) return;
        const targetEntry = getResizeObserverEntry(target, entries);
        if (targetEntry) {
          const { clientWidth, clientHeight } = targetEntry.target;
          onResize(clientWidth, clientHeight, target);
        }
      },
      [element, onResize]
    ),
    element
  );
};
