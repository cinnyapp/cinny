// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useCallback, useEffect, useRef } from 'react';

export const useAlive = (): (() => boolean) => {
  const aliveRef = useRef<boolean>(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const alive = useCallback(() => aliveRef.current, []);
  return alive;
};
