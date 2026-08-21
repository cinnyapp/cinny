import { WritableAtom } from 'jotai';
import { atomWithLocalStorage } from './utils/atomWithLocalStorage';
import { getLocalStorageItem, setLocalStorageItem } from '../../client/localStorage';

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

export type CallPreferencesAtom = WritableAtom<CallPreferences, [CallPreferences], void>;

const getStoreKey = (userId: string) => `${CALL_PREFERENCES}${userId}`;

export const makeCallPreferencesAtom = (userId: string): CallPreferencesAtom => {
  const storeKey = getStoreKey(userId);

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

export const clearCallPreferenceStore = (userId: string) => {
  localStorage.removeItem(getStoreKey(userId));
};
