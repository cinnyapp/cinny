/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

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
