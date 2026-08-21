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
