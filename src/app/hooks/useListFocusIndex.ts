/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback, useState } from 'react';

export const useListFocusIndex = (size: number, initialIndex: number) => {
  const [index, setIndex] = useState(initialIndex);

  const next = useCallback(() => {
    setIndex((i) => {
      const nextIndex = i + 1;
      if (nextIndex >= size) {
        return 0;
      }
      return nextIndex;
    });
  }, [size]);

  const previous = useCallback(() => {
    setIndex((i) => {
      const previousIndex = i - 1;
      if (previousIndex < 0) {
        return size - 1;
      }
      return previousIndex;
    });
  }, [size]);

  const reset = useCallback(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  return {
    index,
    next,
    previous,
    reset,
  };
};
