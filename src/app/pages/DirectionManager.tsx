import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSetting } from '../state/hooks/settings';
import { settingsAtom } from '../state/settings';

/**
 * RTL languages whose ISO 639-1 codes require a right-to-left layout.
 */
const RTL_LANGS = new Set(['fa', 'ar', 'he', 'ur', 'ps', 'sd', 'yi', 'ku', 'ckb', 'ug']);

/**
 * DirectionManager sets `dir` (and `lang`) on `<html>` based on the user's
 * text-direction setting and the currently active i18n language.
 *
 * - 'auto'  → RTL when the detected language is a known RTL language, LTR otherwise
 * - 'ltr'   → always left-to-right
 * - 'rtl'   → always right-to-left
 */
export function DirectionManager() {
  const [textDirection] = useSetting(settingsAtom, 'textDirection');
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = (i18n.language ?? 'en').split('-')[0].toLowerCase();
    const isRtlLang = RTL_LANGS.has(lang);

    const dir: 'ltr' | 'rtl' =
      textDirection === 'auto' ? (isRtlLang ? 'rtl' : 'ltr') : textDirection;

    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language ?? 'en';
  }, [textDirection, i18n.language]);

  return null;
}
