// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { Dispatch, ReactElement, SetStateAction, useState } from 'react';

type UseStateProviderProps<T> = {
  initial: T | (() => T);
  children: (value: T, setter: Dispatch<SetStateAction<T>>) => ReactElement;
};
export function UseStateProvider<T>({ initial, children }: UseStateProviderProps<T>) {
  return children(...useState(initial));
}
