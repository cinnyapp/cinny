import { atom, PrimitiveAtom } from 'jotai';
import type { SetStateAction } from 'jotai';
import { get as getFromDB, set as setInDB } from 'idb-keyval';

export const setIndexedDBItem = async <T>(key: string, value: T) => {
  await setInDB(key, value);
};

export const atomWithIndexedDB = <T>(key: string, initialValue: T): PrimitiveAtom<T> => {
  const channel = new BroadcastChannel(key);

  const baseAtom = atom(initialValue);
  let isInitialized = false;

  baseAtom.onMount = (setAtom) => {
    (async () => {
      const storedValue = await getFromDB<T>(key);
      if (storedValue !== undefined && !isInitialized) {
        setAtom(storedValue);
      }
      isInitialized = true;
    })();

    const handleChange = (event: MessageEvent) => {
      setAtom(event.data);
    };
    channel.addEventListener('message', handleChange);
    return () => {
      channel.removeEventListener('message', handleChange);
    };
  };

  const derivedAtom = atom<T, [SetStateAction<T>], void>(
    (get) => get(baseAtom),
    (get, set, update: SetStateAction<T>) => {
      const currentValue = get(baseAtom);
      const newValue =
        typeof update === 'function' ? (update as (prev: T) => T)(currentValue) : update;

      isInitialized = true;
      set(baseAtom, newValue);
      setIndexedDBItem(key, newValue);
      channel.postMessage(newValue);
    }
  );

  return derivedAtom;
};
