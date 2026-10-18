import { SettingsPages } from '../pages';
import { GENERATED_SETTINGS_INDEX } from './settingsIndex.generated';
import { fuzzyMatch } from './fuzzyMatch';
import type { Match } from './fuzzyMatch';

export type SettingsIndexEntry = {
  page: SettingsPages;
  /** Human name of the settings page this entry lives on. */
  pageName: string;
  /** The card group the setting sits under, when the page has groups. */
  section?: string;
  title: string;
  description?: string;
  /** Extra words that should find this setting but are not shown. */
  keywords?: string[];
};

/**
 * Synonyms for settings whose on-screen wording is not what you would type.
 * Keyed by the generated entry's title.
 */
const KEYWORDS: Record<string, string[]> = {
  Theme: ['dark', 'light', 'colour', 'color', 'appearance'],
  'System Theme': ['dark', 'light', 'auto', 'colour', 'color'],
  'Monochrome Mode': ['black and white', 'grayscale', 'greyscale', 'contrast'],
  'Page Zoom': ['font size', 'text size', 'bigger', 'smaller', 'scale'],
  'Twitter Emoji': ['twemoji', 'emoji font'],
  'Markdown Formatting': ['bold', 'italic', 'formatting'],
  'ENTER for Newline': ['enter key', 'send on enter', 'shift enter'],
  'Hide Typing & Read Receipts': ['privacy', 'typing indicator', 'blue ticks', 'seen'],
  'Hide Unread Activity Dots': ['badge', 'grey dot', 'notification dot'],
  'Show Pinned Message Banner': ['pin', 'pinned', 'banner', 'bar'],
  'Show All Chats in Home': ['home', 'spaces', 'folders', 'whatsapp', 'telegram'],
  'Do not load old chats': [
    'lite',
    'lite mode',
    'speed',
    'slow',
    'faster',
    'startup',
    'loading',
    'heating up',
  ],
  'Count a chat as old after': ['lite', 'lite mode', 'window', 'days', 'months'],
  'Also ask the server to skip them': ['lite', 'lite mode', 'sync filter', 'server'],
  'Older chats': ['lite', 'lite mode', 'show all', 'restore'],
  'Default Language': ['transcribe', 'transcription', 'whisper', 'voice note', 'speech'],
  'Transcription Server URL': ['transcribe', 'whisper', 'endpoint', 'api', 'backend'],
  'Transcription Server Secret': ['transcribe', 'whisper', 'token', 'api', 'password'],
  'Auto-translate all messages everywhere': ['translate', 'language', 'translation'],
  'Translate into': ['translate', 'language', 'target'],
  'Disable Media Auto Load': ['images', 'photos', 'video', 'data', 'bandwidth'],
  'Url Preview': ['link preview', 'embed'],
  'Desktop Notifications': ['alerts', 'push', 'popup'],
  'Notification Sound': ['sound', 'audio', 'ping', 'beep'],
  'Clear Cache & Reload': ['reset', 'slow', 'stuck', 'refresh', 'storage'],
  'Export Messages Data': ['backup', 'download'],
  'Import Messages Data': ['restore', 'upload'],
  'Access Token': ['api', 'developer', 'secret'],
  'Enable Developer Tools': ['debug', 'advanced'],
  'Device Verification': ['encryption', 'keys', 'cross signing', 'security'],
  'Local Backup': ['key backup', 'encryption', 'recovery'],
  'Date Format': ['time', 'clock', 'dd mm yyyy'],
  '24-Hour Time Format': ['clock', 'am pm', 'time'],
  'Message Layout': ['bubble', 'compact', 'modern'],
  'Message Spacing': ['compact', 'comfortable', 'density'],
};

/** Entries for the pages themselves, so "devices" finds the Devices page. */
const PAGE_ENTRIES: SettingsIndexEntry[] = [
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    title: 'General',
    description: 'Appearance, navigation, message layout, loading speed, transcription.',
    keywords: ['theme', 'zoom', 'layout', 'lite', 'transcribe'],
  },
  {
    page: SettingsPages.AccountPage,
    pageName: 'Account',
    title: 'Account',
    description: 'Profile, display name, avatar, email, blocked users, password.',
    keywords: ['profile', 'avatar', 'name', 'password', 'email', 'blocked', 'ignored'],
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    title: 'Notifications',
    description: 'Desktop alerts, sounds, keywords, per-room notification rules.',
    keywords: ['alerts', 'sound', 'mute', 'keyword', 'push'],
  },
  {
    page: SettingsPages.DevicesPage,
    pageName: 'Devices',
    title: 'Devices',
    description: 'Your sessions, device verification and encryption key backup.',
    keywords: ['sessions', 'logout', 'verify', 'encryption', 'security', 'keys'],
  },
  {
    page: SettingsPages.EmojisStickersPage,
    pageName: 'Emojis & Stickers',
    title: 'Emojis & Stickers',
    description: 'Your emoji and sticker packs.',
    keywords: ['emoji', 'sticker', 'pack', 'reaction'],
  },
  {
    page: SettingsPages.TranslationPage,
    pageName: 'Translation',
    title: 'Translation',
    description: 'Translate messages automatically into your language.',
    keywords: ['translate', 'language', 'auto translate'],
  },
  {
    page: SettingsPages.DeveloperToolsPage,
    pageName: 'Developer Tools',
    title: 'Developer Tools',
    description: 'Account data and other developer options.',
    keywords: ['debug', 'account data', 'advanced'],
  },
  {
    page: SettingsPages.AboutPage,
    pageName: 'About',
    title: 'About',
    description: 'App version, credits, licence and source code.',
    keywords: ['version', 'credits', 'licence', 'license', 'source'],
  },
];

export const SETTINGS_INDEX: SettingsIndexEntry[] = [
  ...PAGE_ENTRIES,
  ...GENERATED_SETTINGS_INDEX.map((entry) => ({
    ...entry,
    keywords: KEYWORDS[entry.title],
  })),
];

export type SettingsSearchResult = {
  entry: SettingsIndexEntry;
  score: number;
  /** Highlight ranges inside entry.title (empty when the hit was elsewhere). */
  titleMatch: Match | null;
};

const FIELD_WEIGHT = {
  title: 1,
  section: 0.45,
  page: 0.4,
  description: 0.35,
  keyword: 0.55,
};

/**
 * Search the whole settings catalogue. Returns the best matches first.
 * An empty query returns an empty list (the caller shows the normal menu).
 */
export const searchSettings = (
  query: string,
  index: SettingsIndexEntry[] = SETTINGS_INDEX,
  limit = 40
): SettingsSearchResult[] => {
  const q = query.trim();
  if (!q) return [];

  const results: SettingsSearchResult[] = [];

  index.forEach((entry) => {
    const titleMatch = fuzzyMatch(q, entry.title);
    const sectionMatch = entry.section ? fuzzyMatch(q, entry.section) : null;
    const pageMatch = fuzzyMatch(q, entry.pageName);
    const descriptionMatch = entry.description ? fuzzyMatch(q, entry.description) : null;
    const keywordMatch = (entry.keywords ?? []).reduce<Match | null>((best, keyword) => {
      const m = fuzzyMatch(q, keyword);
      if (m && (!best || m.score > best.score)) return m;
      return best;
    }, null);

    const score = Math.max(
      (titleMatch?.score ?? 0) * FIELD_WEIGHT.title,
      (sectionMatch?.score ?? 0) * FIELD_WEIGHT.section,
      (pageMatch?.score ?? 0) * FIELD_WEIGHT.page,
      (descriptionMatch?.score ?? 0) * FIELD_WEIGHT.description,
      (keywordMatch?.score ?? 0) * FIELD_WEIGHT.keyword
    );

    if (score > 0) {
      results.push({ entry, score, titleMatch });
    }
  });

  results.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
  return results.slice(0, limit);
};
