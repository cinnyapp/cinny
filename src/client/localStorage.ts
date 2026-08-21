import { clearCallPreferenceStore } from '../app/state/callPreferences';
import { clearClosedLobbyCategoriesStore } from '../app/state/closedLobbyCategories';
import { clearClosedNavCategoriesStore } from '../app/state/closedNavCategories';
import { clearNavToActivePathStore } from '../app/state/navToActivePath';
import { clearOpenedSidebarFolderStore } from '../app/state/openedSidebarFolder';
import { clearSettingsStore } from '../app/state/settings';

export const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
  const item = window.localStorage.getItem(key);
  if (item === null) return defaultValue;
  if (item === 'undefined') return undefined as T;
  try {
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
};

export const setLocalStorageItem = <T>(key: string, value: T) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const clearUserLocalStorage = (userId: string) => {
  clearClosedNavCategoriesStore(userId);
  clearClosedLobbyCategoriesStore(userId);
  clearNavToActivePathStore(userId);
  clearOpenedSidebarFolderStore(userId);
  clearCallPreferenceStore(userId);
  clearSettingsStore(userId);
};
