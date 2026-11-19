/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useReducer } from 'react';

const reducer = (prevCount: number): number => prevCount + 1;

export const useForceUpdate = (): [number, () => void] => {
  const [state, dispatch] = useReducer<typeof reducer>(reducer, 0);

  return [state, dispatch];
};
