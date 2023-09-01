import { useCallback, useState } from 'react';
import { getResizeObserverEntry, useResizeObserver } from './useResizeObserver';

export const TABLET_BREAKPOINT = 1124;
export const MOBILE_BREAKPOINT = 750;

export enum ScreenSize {
  Desktop = 'Desktop',
  Tablet = 'Tablet',
  Mobile = 'Mobile',
}

export const getScreenSize = (width: number): ScreenSize => {
  if (width > TABLET_BREAKPOINT) return ScreenSize.Desktop;
  if (width > MOBILE_BREAKPOINT) return ScreenSize.Tablet;
  return ScreenSize.Mobile;
};

export const useScreenSize = (): [ScreenSize, number] => {
  const [size, setSize] = useState<[ScreenSize, number]>([
    getScreenSize(document.body.clientWidth),
    document.body.clientWidth,
  ]);
  useResizeObserver(
    useCallback((entries) => {
      const bodyEntry = getResizeObserverEntry(document.body, entries);
      if (bodyEntry) {
        const bWidth = bodyEntry.contentRect.width;
        setSize([getScreenSize(bWidth), bWidth]);
      }
    }, []),
    document.body
  );

  return size;
};
