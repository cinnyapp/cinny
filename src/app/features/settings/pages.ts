/**
 * The settings pages.
 *
 * Kept in its own module so the settings search index can reference them
 * without importing Settings.tsx (which imports the search back — a cycle
 * that would leave the values undefined at module-eval time).
 *
 * Written as a const object rather than a TS `enum` so the file is erasable
 * TypeScript: plain `node --experimental-strip-types` can import it, which is
 * what scripts/test-settings-search.mjs does.
 */
export const SettingsPages = {
  GeneralPage: 0,
  AccountPage: 1,
  NotificationPage: 2,
  DevicesPage: 3,
  EmojisStickersPage: 4,
  TranslationPage: 5,
  DeveloperToolsPage: 6,
  AboutPage: 7,
} as const;

// eslint-disable-next-line no-redeclare -- the value and its type share a name on purpose.
export type SettingsPages = typeof SettingsPages[keyof typeof SettingsPages];
