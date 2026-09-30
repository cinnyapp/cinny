// Languages offered by the in-app translation feature. These mirror the language packs installed
// on Chagai's offline "Libre"/argos backend (matrix-os/translate/translate.py). The backend can
// also report its installed pairs via GET /langs, but this static list drives the picker UI so it
// works even before the first API call.

export type TranslationLanguage = {
  code: string;
  name: string;
  flag: string;
};

export const TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
];

const LANG_BY_CODE = new Map(TRANSLATION_LANGUAGES.map((l) => [l.code, l]));

export const langName = (code: string): string =>
  LANG_BY_CODE.get((code || '').toLowerCase())?.name ?? (code || '').toUpperCase();

export const langFlag = (code: string): string =>
  LANG_BY_CODE.get((code || '').toLowerCase())?.flag ?? '🌐';

export const isKnownLang = (code: string): boolean => LANG_BY_CODE.has((code || '').toLowerCase());

export const DEFAULT_TARGET_LANG = 'en';
