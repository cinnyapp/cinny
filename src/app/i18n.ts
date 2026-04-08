import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend, { HttpBackendOptions } from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';
import { trimTrailingSlash } from './utils/common';
import { getSettings, setSettings } from './state/settings';

const supportedLngs = ['en', 'ru'] as const;
const DEFAULT_LNG = 'en';
const DEFAULT_NS = 'roomCommon';

const initialSavedLng = getSettings().language;
const initialLng =
  typeof initialSavedLng === 'string' && supportedLngs.includes(initialSavedLng as (typeof supportedLngs)[number])
    ? initialSavedLng
    : undefined;

const initPromise = i18n
  // i18next-http-backend
  // loads translations from your server
  // https://github.com/i18next/i18next-http-backend
  .use(Backend)
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init<HttpBackendOptions>({
    debug: false,
    fallbackLng: DEFAULT_LNG,
    supportedLngs: [...supportedLngs],
    defaultNS: DEFAULT_NS,
    ns: [DEFAULT_NS],
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    react: {
      useSuspense: false,
    },
    ...(initialLng ? { lng: initialLng } : {}),
    load: 'languageOnly',
    detection: {
      order: ['navigator', 'htmlTag'],
      caches: [],
    },
    backend: {
      loadPath: `${trimTrailingSlash(import.meta.env.BASE_URL)}/public/locales/{{lng}}/{{ns}}.json`,
    },
  });

// Persist initial detected language into settings (only if it isn't set yet).
initPromise.then(() => {
  const resolvedLng = i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LNG;
  const settings = getSettings();

  // Normalize to supported list.
  const normalizedLng = supportedLngs.includes(resolvedLng as (typeof supportedLngs)[number])
    ? resolvedLng
    : DEFAULT_LNG;

  // Don't overwrite an explicit user choice.
  if (settings.language == null) {
    setSettings({ ...settings, language: normalizedLng });
  }
});

export default i18n;
