/* eslint-disable */
/**
 * GENERATED FILE — do not edit by hand.
 * Run `node scripts/build-settings-index.mjs` after adding a setting.
 *
 * 55 settings indexed for the Settings search field.
 */
import { SettingsPages } from '../pages';
import type { SettingsIndexEntry } from './settingsIndex';

export const GENERATED_SETTINGS_INDEX: SettingsIndexEntry[] = [
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    title: 'Light Theme',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    title: 'Dark Theme',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Appearance',
    title: 'System Theme',
    description: 'Choose between light and dark theme based on system preference.',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Appearance',
    title: 'Theme',
    description: 'Theme to use when system theme is not enabled.',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Appearance',
    title: 'Monochrome Mode',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Appearance',
    title: 'Twitter Emoji',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Appearance',
    title: 'Page Zoom',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Appearance',
    title: 'Show Pinned Message Banner',
    description:
      "Show a small bar above the timeline with the room's pinned messages, with arrows to step through them and a tap to jump to the message. The pin button in the room header and the Pinned Messages list are unaffected.",
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Navigation',
    title: 'Show All Chats in Home',
    description:
      'List every chat under Home, including the ones that live inside a space (such as the WhatsApp and Telegram bridge spaces) and your direct chats. Turn off to keep only rooms that do not belong to any space. Spaces themselves are unaffected.',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Navigation',
    title: 'Date Format',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Date & Time',
    title: '24-Hour Time Format',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Editor',
    title: 'ENTER for Newline',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Editor',
    title: 'Markdown Formatting',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Editor',
    title: 'Hide Typing & Read Receipts',
    description: 'Turn off both typing status and read receipts to keep your activity private.',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Messages',
    title: 'Message Layout',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Messages',
    title: 'Message Spacing',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Messages',
    title: 'Legacy Username Color',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Messages',
    title: 'Hide Membership Change',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Messages',
    title: 'Hide Profile Change',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Messages',
    title: 'Disable Media Auto Load',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Messages',
    title: 'Url Preview',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Messages',
    title: 'Url Preview in Encrypted Room',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Messages',
    title: 'Show Hidden Events',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Loading Speed',
    title: 'Do not load old chats',
    description:
      'Chats where nobody has written for a long time are skipped completely when the app starts, instead of being rebuilt every time. They come back on their own as soon as someone writes in them. Anything unread, favourited, a space, or a bridge admin chat is always loaded.',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Loading Speed',
    title: 'Count a chat as old after',
    description: 'Measured from the last real message, not from bridge housekeeping.',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Loading Speed',
    title: 'Also ask the server to skip them',
    description:
      'Fastest, and stops the bridges from dragging dead chats back in. The catch: while this is on, a new message in a skipped chat does not reach the app — you only see it as a notification until you load the older chats again. Leave off unless you want maximum speed.',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Loading Speed',
    title: 'Older chats',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Transcription',
    title: 'Default Language',
    description: 'Language used when transcribing voice messages. Auto lets Whisper detect it.',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Transcription',
    title: 'Transcription Server URL',
  },
  {
    page: SettingsPages.GeneralPage,
    pageName: 'General',
    section: 'Transcription',
    title: 'Transcription Server Secret',
    description:
      'Optional bearer token for the backend. Leave empty to use the VITE_TRANSCRIBE_API_SECRET env var, or the browser session as a fallback.',
  },
  {
    page: SettingsPages.AccountPage,
    pageName: 'Account',
    section: 'Contact Information',
    title: 'Email Address',
    description: 'Email address attached to your account.',
  },
  {
    page: SettingsPages.AccountPage,
    pageName: 'Account',
    section: 'Blocked Users',
    title: 'Select User',
    description: 'Prevent receiving messages or invites from user by adding their userId.',
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    section: 'All Messages',
    title: '1-to-1 Chats',
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    section: 'All Messages',
    title: '1-to-1 Chats (Encrypted)',
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    section: 'All Messages',
    title: 'Rooms',
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    section: 'All Messages',
    title: 'Rooms (Encrypted)',
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    section: 'Keyword Messages',
    title: 'Select Keyword',
    description: 'Set a notification preference for message containing given keyword.',
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    section: 'Special Messages',
    title: 'Mention @room',
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    section: 'Special Messages',
    title: 'Contains @room',
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    title: 'Email Notification',
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    section: 'System',
    title: 'Desktop Notifications',
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    section: 'System',
    title: 'Notification Sound',
    description: 'Play sound when new message arrive.',
  },
  {
    page: SettingsPages.NotificationPage,
    pageName: 'Notifications',
    section: 'System',
    title: 'Hide Unread Activity Dots',
    description:
      'Hide the small empty indicator shown for rooms with unread events that did not trigger a notification (e.g. rooms set to mentions-only or otherwise downgraded). Rooms with notification or highlight counts are unaffected.',
  },
  {
    page: SettingsPages.DevicesPage,
    pageName: 'Devices',
    section: 'Security',
    title: 'Device Verification',
    description: 'To verify device identity and grant access to encrypted messages.',
  },
  {
    page: SettingsPages.DevicesPage,
    pageName: 'Devices',
    title: 'Export Messages Data',
    description:
      'Save password protected copy of encryption data on your device to decrypt messages later.',
  },
  {
    page: SettingsPages.DevicesPage,
    pageName: 'Devices',
    title: 'Import Messages Data',
    description:
      'Load password protected copy of encryption data from device to decrypt your messages.',
  },
  {
    page: SettingsPages.DevicesPage,
    pageName: 'Devices',
    section: 'Others',
    title: 'Device Dashboard',
    description: 'Manage your devices on OIDC dashboard.',
  },
  {
    page: SettingsPages.EmojisStickersPage,
    pageName: 'Emojis & Stickers',
    section: 'Favorite Packs',
    title: 'Select Pack',
    description: 'Pick emojis and stickers pack from rooms to use in all rooms.',
  },
  {
    page: SettingsPages.TranslationPage,
    pageName: 'Translation',
    section: 'Auto-translate',
    title: 'Auto-translate all messages everywhere',
    description:
      'Automatically translate every incoming message into your chosen language, in all chats. Runs on your own server (offline) — nothing is sent to a cloud translator. You can still translate any single message on demand with the Translate button under it.',
  },
  {
    page: SettingsPages.TranslationPage,
    pageName: 'Translation',
    section: 'Auto-translate',
    title: 'Translate into',
    description:
      'The language messages are translated into (both for auto-translate and as the default for the per-message Translate button).',
  },
  {
    page: SettingsPages.TranslationPage,
    pageName: 'Translation',
    section: 'Auto-translate',
    title: 'Per-chat control',
    description:
      "Auto-translate can also be turned on or off for a single chat from that chat's room settings, overriding this global setting.",
  },
  {
    page: SettingsPages.DeveloperToolsPage,
    pageName: 'Developer Tools',
    section: 'Account Data',
    title: 'Global',
    description: 'Data stored in your global account data.',
  },
  {
    page: SettingsPages.DeveloperToolsPage,
    pageName: 'Developer Tools',
    section: 'Options',
    title: 'Enable Developer Tools',
  },
  {
    page: SettingsPages.DeveloperToolsPage,
    pageName: 'Developer Tools',
    section: 'Options',
    title: 'Access Token',
    description: 'Copy access token to clipboard.',
  },
  {
    page: SettingsPages.AboutPage,
    pageName: 'About',
    section: 'Options',
    title: 'Clear Cache & Reload',
    description: 'Clear all your locally stored data and reload from server.',
  },
];
