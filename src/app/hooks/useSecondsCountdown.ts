/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useEffect, useState } from 'react';

export const useSecondsCountdown = (seconds: number, onEnd?: () => void): number => {
  const [countdown, setCountdown] = useState(seconds);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (countdown <= 1) {
        onEnd?.();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [countdown, onEnd]);

  return countdown;
};
