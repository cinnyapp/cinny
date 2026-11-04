/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useEffect, useRef } from 'react';

export const usePreviousValue = <T>(currentValue: T, initialValue: T) => {
  const valueRef = useRef(initialValue);

  useEffect(() => {
    valueRef.current = currentValue;
  }, [currentValue]);

  return valueRef.current;
};
