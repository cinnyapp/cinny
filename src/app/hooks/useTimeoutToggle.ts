/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Temporarily sets a boolean state.
 *
 * @param duration - Duration in milliseconds before resetting (default: 1500)
 * @param initial - Initial value (default: false)
 */
export function useTimeoutToggle(duration = 1500, initial = false): [boolean, () => void] {
  const [active, setActive] = useState(initial);
  const timeoutRef = useRef<number | null>(null);

  const clear = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const trigger = useCallback(() => {
    setActive(!initial);
    clear();
    timeoutRef.current = window.setTimeout(() => {
      setActive(initial);
      timeoutRef.current = null;
    }, duration);
  }, [duration, initial]);

  useEffect(
    () => () => {
      clear();
    },
    []
  );

  return [active, trigger];
}
