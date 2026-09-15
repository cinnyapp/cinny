// Client for Chagai's offline translation backend (matrix-os/web/app_translate_api.py).
// 100% on his server — the text goes to HIS API, which runs argos/"Libre" locally; it NEVER goes
// to a cloud translator. Endpoint + shared token come from public/config.json (ClientConfig).
//
// A tiny in-memory cache keyed by (eventId|targetLang) means each message is translated at most
// once per target language for the lifetime of the tab — we never spam the backend on re-render.

import { ClientConfig } from '../../hooks/useClientConfig';

export type TranslateResult = {
  ok: boolean;
  translated: string;
  detectedSource: string;
  target: string;
  reason: string;
  engine: string;
};

export type TranslationSettings = {
  endpoint: string;
  token: string;
  defaultTargetLang: string;
};

const trimTrailingSlash = (s: string): string => s.replace(/\/+$/, '');

/** Returns the configured translation settings, or null if translation isn't configured. */
export const getTranslationSettings = (config: ClientConfig): TranslationSettings | null => {
  const t = config.translation;
  const endpoint = t?.endpoint ? trimTrailingSlash(t.endpoint) : '';
  if (!endpoint) return null;
  return {
    endpoint,
    token: t?.token ?? '',
    defaultTargetLang: t?.defaultTargetLang || 'en',
  };
};

// Cache: (eventId + '|' + targetLang) -> result. Module-level so it survives component unmounts.
const translationCache = new Map<string, TranslateResult>();
const cacheKey = (id: string, target: string): string => `${id}|${target}`;

export const getCachedTranslation = (
  eventId: string,
  targetLang: string
): TranslateResult | undefined => translationCache.get(cacheKey(eventId, targetLang));

/**
 * Translate `text` into `targetLang` via Chagai's on-box API. If `eventId` is given, the result is
 * cached so subsequent calls for the same event+target are instant and don't hit the backend.
 * Message text is sent as-is and only translated — never interpreted.
 */
export const translateText = async (
  settings: TranslationSettings,
  text: string,
  targetLang: string,
  opts?: { eventId?: string; sourceLang?: string; signal?: AbortSignal }
): Promise<TranslateResult> => {
  const target = (targetLang || settings.defaultTargetLang || 'en').toLowerCase();
  const eventId = opts?.eventId;

  if (eventId) {
    const cached = translationCache.get(cacheKey(eventId, target));
    if (cached) return cached;
  }

  const res = await fetch(`${settings.endpoint}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.token ? { Authorization: `Bearer ${settings.token}` } : {}),
    },
    body: JSON.stringify({
      text,
      target_lang: target,
      source_lang: opts?.sourceLang ?? 'auto',
    }),
    signal: opts?.signal,
  });

  if (!res.ok) {
    throw new Error(`translate API ${res.status}`);
  }
  const data = await res.json();
  const result: TranslateResult = {
    ok: Boolean(data.ok),
    translated: typeof data.translated === 'string' ? data.translated : text,
    detectedSource: data.detected_source ?? '',
    target: data.target ?? target,
    reason: data.reason ?? '',
    engine: data.engine ?? '',
  };

  if (eventId) {
    translationCache.set(cacheKey(eventId, target), result);
  }
  return result;
};
