/**
 * Language options for local Whisper transcription.
 *
 * `code` is the Whisper/ISO-639-1 language code sent to the backend as the
 * optional `language` field. An empty string means "auto-detect" (the field is
 * omitted from the request).
 *
 * This list is intentionally small and static; extend it as needed.
 */
export type TranscribeLanguage = {
  code: string;
  name: string;
};

export const AUTO_DETECT_CODE = '';

export const TRANSCRIBE_LANGUAGES: TranscribeLanguage[] = [
  { code: AUTO_DETECT_CODE, name: 'Auto detect' },
  { code: 'de', name: 'German' },
  { code: 'en', name: 'English' },
  { code: 'he', name: 'Hebrew' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
];

export const getTranscribeLanguageName = (code: string): string =>
  TRANSCRIBE_LANGUAGES.find((l) => l.code === code)?.name ?? code;
