import { WritableAtom } from 'jotai';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

export type CallPreferences = {
  microphone: boolean;
  video: boolean;
  sound: boolean;
};

const CALL_PREFERENCES = 'callPreferences';

const DEFAULT_PREFERENCES: CallPreferences = {
  microphone: true,
  video: false,
  sound: true,
};

export type CallPreferencesAtom = WritableAtom<CallPreferences, [CallPreferences], undefined>;

export const makeCallPreferencesAtom = (userId: string): CallPreferencesAtom => {
  const storeKey = `${CALL_PREFERENCES}${userId}`;

  const callPreferencesAtom = atomWithLocalStorage<CallPreferences>(
    storeKey,
    (key) => {
      const v = getLocalStorageItem<CallPreferences>(key, DEFAULT_PREFERENCES);
      return v;
    },
    (key, value) => {
      setLocalStorageItem(key, value);
    }
  );

  return callPreferencesAtom;
};
