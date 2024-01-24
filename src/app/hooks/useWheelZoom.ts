import { useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

type OnZoom = (delta: number, cursor: Position) => void;

export const useWheelZoom = (element: HTMLElement | null, onZoom: OnZoom) => {
  useEffect(() => {
    if (!element) return undefined;

    const wheelHandler = (event: WheelEvent) => {
      event.preventDefault();

      onZoom(event.deltaY, {
        x: event.pageX,
        y: event.pageY,
      });
    };

    element.addEventListener('wheel', wheelHandler);

    return () => {
      element.removeEventListener('wheel', wheelHandler);
    };
  }, [element, onZoom]);
};
