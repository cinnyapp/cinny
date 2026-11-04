// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useEffect } from 'react';

export const useKeyDown = (target: Window, callback: (evt: KeyboardEvent) => void) => {
  useEffect(() => {
    target.addEventListener('keydown', callback);
    return () => {
      target.removeEventListener('keydown', callback);
    };
  }, [target, callback]);
};
