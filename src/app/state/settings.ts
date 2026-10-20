import { atom } from 'jotai';
import type { ChatSort, MutedMode } from '../utils/chatList';

const STORAGE_KEY = 'settings';
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
  hideUnreadActivityDots: boolean;

  // 1:1 chats: show the other person's own (live) profile picture instead of
  // the room's picture. Bridges copy the contact's photo onto the room once and
  // do not always keep it current (see utils/dmAvatar.ts).
  preferContactPhoto: boolean;

  // Home lists every joined chat (rooms *and* direct chats), including the ones
  // that are a child of a space — e.g. the bridge "WhatsApp"/"Telegram" spaces.
  // When false, Home keeps upstream Cinny's behaviour and only lists rooms that
  // do not belong to any space.
  homeShowsAllRooms: boolean;

  // Chat list (Home + Direct): see utils/chatList.ts and utils/roomActivity.ts.
  // chatListSort: 'activity' = last real message (not the last event of any kind).
  // chatListFilter: the last filter chip picked (All / Unread / People / … / a network).
  // chatListMuted: how muted + archived chats are placed.
  // chatListServerLookup: ask the homeserver for the last message of chats whose
  // loaded events contain none (one small GET each, a few hundred at most).
  chatListSort: ChatSort;
  chatListFilter: string;
  chatListMuted: MutedMode;
  chatListShowFilters: boolean;
  chatListServerLookup: boolean;

  // Show the "Pinned" bar above the timeline (the room header's pin button and
  // the Pinned Messages list are unaffected).
  showPinnedBanner: boolean;
  // "Lite mode" — do not load chats that have gone quiet (see client/lite-mode.ts).
  // liteMode: skip them entirely on load.
  // liteWindowDays: a chat counts as quiet when its newest message is older than this.
  // liteServerFilter: also ask the homeserver to leave them out of /sync (faster,
  // but a new message in a skipped chat only arrives once the chat is loaded again).
  // liteModeChoice: 'auto' (default) = on for accounts with 2,000+ chats (30-day
  // window), off otherwise; 'on' / 'off' = the user decided. The old boolean
  // `liteMode: true` still counts as 'on'.
  liteMode: boolean;
  liteModeChoice: 'auto' | 'on' | 'off';
  liteWindowDays: number;
  liteServerFilter: boolean;

  hour24Clock: boolean;
  dateFormatString: string;

  developerTools: boolean;

  // Local Whisper transcription (see features/transcription).
  // transcribeLanguage: ISO-639-1 code, '' = auto-detect.
  transcribeLanguage: string;
  // Optional overrides for the transcription backend; empty => use the
  // VITE_TRANSCRIBE_API_BASE / VITE_TRANSCRIBE_API_SECRET env vars / defaults.
  transcribeApiBase: string;
  transcribeApiSecret: string;
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
  hideUnreadActivityDots: false,
  preferContactPhoto: true,

  homeShowsAllRooms: true,

  chatListSort: 'activity',
  chatListFilter: 'all',
  chatListMuted: 'stay',
  chatListShowFilters: true,
  chatListServerLookup: true,

  showPinnedBanner: true,
  liteMode: false,
  liteModeChoice: 'auto',
  liteWindowDays: 90,
  liteServerFilter: false,

  hour24Clock: false,
  dateFormatString: 'D MMM YYYY',

  developerTools: false,

  transcribeLanguage: '',
  transcribeApiBase: '',
  transcribeApiSecret: '',
};

export const getSettings = () => {
  const settings = localStorage.getItem(STORAGE_KEY);
  if (settings === null) return defaultSettings;
  return {
    ...defaultSettings,
    ...(JSON.parse(settings) as Settings),
  };
};

export const setSettings = (settings: Settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

const baseSettings = atom<Settings>(getSettings());
export const settingsAtom = atom<Settings, [Settings], undefined>(
  (get) => get(baseSettings),
  (get, set, update) => {
    set(baseSettings, update);
    setSettings(update);
  }
);
