import { useEffect, useMemo } from 'react';

export type OnResizeCallback = (entries: ResizeObserverEntry[]) => void;

export const getResizeObserverEntry = (
  target: Element,
  entries: ResizeObserverEntry[]
): ResizeObserverEntry | undefined => entries.find((entry) => entry.target === target);

export const useResizeObserver = (
  element: Element | null,
  onResizeCallback: OnResizeCallback
): ResizeObserver => {
  const resizeObserver = useMemo(() => new ResizeObserver(onResizeCallback), [onResizeCallback]);

  useEffect(() => {
    if (element) resizeObserver.observe(element);
    return () => {
      if (element) resizeObserver.unobserve(element);
    };
  }, [resizeObserver, element]);

  return resizeObserver;
};
