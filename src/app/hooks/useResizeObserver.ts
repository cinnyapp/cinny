/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useEffect, useMemo } from 'react';

export type OnResizeCallback = (entries: ResizeObserverEntry[]) => void;

export const getResizeObserverEntry = (
  target: Element,
  entries: ResizeObserverEntry[]
): ResizeObserverEntry | undefined => entries.find((entry) => entry.target === target);

export const useResizeObserver = (
  onResizeCallback: OnResizeCallback,
  observeElement?: Element | null | (() => Element | null)
): ResizeObserver => {
  const resizeObserver = useMemo(() => new ResizeObserver(onResizeCallback), [onResizeCallback]);

  useEffect(() => () => resizeObserver?.disconnect(), [resizeObserver]);

  useEffect(() => {
    const element = typeof observeElement === 'function' ? observeElement() : observeElement;
    if (element) resizeObserver.observe(element);
    return () => {
      if (element) resizeObserver.unobserve(element);
    };
  }, [resizeObserver, observeElement]);

  return resizeObserver;
};
