import { WritableAtom } from 'jotai';
import { atomWithLocalStorage } from './utils/atomWithLocalStorage';
import { getLocalStorageItem, setLocalStorageItem } from '../../client/localStorage';

export type DateFormat =
  | 'D MMM YYYY'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY/MM/DD'
  | 'YYYY-MM-DD'
  | '';
export type MessageSpacing = '0' | '100' | '200' | '300' | '400' | '500';
export enum MessageLayout {
  Modern = 0,
  Compact = 1,
  Bubble = 2,
}

export interface Settings {
  themeId?: string;
  useSystemTheme: boolean;
  lightThemeId?: string;
  darkThemeId?: string;
  monochromeMode?: boolean;
  isMarkdown: boolean;
  editorToolbar: boolean;
  twitterEmoji: boolean;
  pageZoom: number;
  hideActivity: boolean;
  roomListShowAvatar: boolean;
  roomListByActivity: boolean;

  isPeopleDrawer: boolean;
  memberSortFilterIndex: number;
  enterForNewline: boolean;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  hideMembershipEvents: boolean;
  hideNickAvatarEvents: boolean;
  mediaAutoLoad: boolean;
  urlPreview: boolean;
  encUrlPreview: boolean;
  showHiddenEvents: boolean;
  legacyUsernameColor: boolean;

  showNotifications: boolean;
  isNotificationSounds: boolean;

  hour24Clock: boolean;
  dateFormatString: string;

  developerTools: boolean;
}

const defaultSettings: Settings = {
  themeId: undefined,
  useSystemTheme: true,
  lightThemeId: undefined,
  darkThemeId: undefined,
  monochromeMode: false,
  isMarkdown: true,
  editorToolbar: false,
  twitterEmoji: false,
  pageZoom: 100,
  hideActivity: false,
  roomListShowAvatar: false,
  roomListByActivity: false,

  isPeopleDrawer: true,
  memberSortFilterIndex: 0,
  enterForNewline: false,
  messageLayout: 0,
  messageSpacing: '400',
  hideMembershipEvents: false,
  hideNickAvatarEvents: true,
  mediaAutoLoad: true,
  urlPreview: true,
  encUrlPreview: false,
  showHiddenEvents: false,
  legacyUsernameColor: false,

  showNotifications: true,
  isNotificationSounds: true,

  hour24Clock: false,
  dateFormatString: 'D MMM YYYY',

  developerTools: false,
};

const STORAGE_KEY = 'settings';
const getStoreKey = (userId: string): string => `${STORAGE_KEY}${userId}`;

export type SettingsAtom = WritableAtom<Settings, [Settings], void>;

export const makeSettingsAtom = (userId: string): SettingsAtom => {
  const settingsAtom = atomWithLocalStorage<Settings>(
    getStoreKey(userId),
    (key) => {
      // migrate from settings item without username postfix
      const migrateSettings = getLocalStorageItem<Settings>(STORAGE_KEY, defaultSettings);
      if (migrateSettings !== defaultSettings) {
        setLocalStorageItem(key, migrateSettings);
        localStorage.removeItem(STORAGE_KEY);
      }
      // end of migration

      return getLocalStorageItem<Settings>(key, migrateSettings);
    },
    (key, settings) => {
      setLocalStorageItem(key, settings);
    }
  );

  return settingsAtom;
};

export const clearSettingsStore = (userId: string) => {
  localStorage.removeItem(getStoreKey(userId));
};
