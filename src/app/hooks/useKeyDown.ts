/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useEffect } from 'react';

export const useKeyDown = (target: Window, callback: (evt: KeyboardEvent) => void) => {
  useEffect(() => {
    target.addEventListener('keydown', callback);
    return () => {
      target.removeEventListener('keydown', callback);
    };
  }, [target, callback]);
};
