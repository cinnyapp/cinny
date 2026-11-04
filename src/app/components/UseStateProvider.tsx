/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { Dispatch, ReactElement, SetStateAction, useState } from 'react';

type UseStateProviderProps<T> = {
  initial: T | (() => T);
  children: (value: T, setter: Dispatch<SetStateAction<T>>) => ReactElement;
};
export function UseStateProvider<T>({ initial, children }: UseStateProviderProps<T>) {
  return children(...useState(initial));
}
