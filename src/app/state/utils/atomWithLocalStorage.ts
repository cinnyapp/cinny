/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { atom } from 'jotai';

export type GetLocalStorageItem<T> = (key: string) => T;
export type SetLocalStorageItem<T> = (key: string, value: T) => void;

export const atomWithLocalStorage = <T>(
  key: string,
  getItem: GetLocalStorageItem<T>,
  setItem: SetLocalStorageItem<T>
) => {
  const value = getItem(key);

  const baseAtom = atom<T>(value);

  baseAtom.onMount = (setAtom) => {
    const handleChange = (evt: StorageEvent) => {
      if (evt.key !== key) return;
      setAtom(getItem(key));
    };

    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener('storage', handleChange);
    };
  };

  const localStorageAtom = atom<T, [T], void>(
    (get) => get(baseAtom),
    (get, set, newValue) => {
      set(baseAtom, newValue);
      setItem(key, newValue);
    }
  );

  return localStorageAtom;
};
