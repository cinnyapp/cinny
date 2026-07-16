// React hooks for the in-app translation feature.
//
// useTranslationConfig()  -> reactive translation settings (account-data backed) + updater helpers
// useEventTranslation()   -> translate one message event's text, with loading/error/result state
//                            and optional auto-run when auto-translate is enabled for the room.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MatrixEvent } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useAccountData } from '../../hooks/useAccountData';
import { useClientConfig } from '../../hooks/useClientConfig';
import { trimReplyFromBody } from '../../utils/room';
import {
  TRANSLATION_ACCOUNT_DATA_TYPE,
  TranslationConfig,
  RoomTranslationConfig,
  readTranslationConfig,
  writeTranslationConfig,
  resolveRoomAutoTranslate,
} from './translationConfig';
import {
  getTranslationSettings,
  getCachedTranslation,
  translateText,
  TranslateResult,
  TranslationSettings,
} from './translateApi';
import { DEFAULT_TARGET_LANG } from './languages';

/** Whether translation is configured at all (endpoint present in config.json). */
export const useTranslationSettings = (): TranslationSettings | null => {
  const config = useClientConfig();
  return useMemo(() => getTranslationSettings(config), [config]);
};

export type TranslationConfigApi = {
  config: TranslationConfig;
  setGlobalAuto: (auto: boolean) => Promise<void>;
  setGlobalTargetLang: (lang: string) => Promise<void>;
  setRoomConfig: (roomId: string, roomConfig: RoomTranslationConfig | null) => Promise<void>;
};

/** Reactive translation config from account data, plus updater helpers that persist to account data. */
export const useTranslationConfig = (): TranslationConfigApi => {
  const mx = useMatrixClient();
  // subscribe to account-data changes so the UI reflects updates from any device; the returned
  // event is the reactive trigger for the memo below.
  // The event itself is the reactive source: reading it here makes the memo depend on the latest
  // account-data content (and re-run when it changes on any device).
  const accountDataEvent = useAccountData(TRANSLATION_ACCOUNT_DATA_TYPE);
  const config = useMemo(() => {
    const content = (accountDataEvent?.getContent() as TranslationConfig | undefined) ?? {};
    return {
      globalAuto: content.globalAuto ?? false,
      globalTargetLang: content.globalTargetLang ?? DEFAULT_TARGET_LANG,
      rooms: content.rooms ?? {},
    };
  }, [accountDataEvent]);

  const setGlobalAuto = useCallback(
    async (auto: boolean) => {
      const next = { ...readTranslationConfig(mx), globalAuto: auto };
      await writeTranslationConfig(mx, next);
    },
    [mx]
  );

  const setGlobalTargetLang = useCallback(
    async (lang: string) => {
      const next = { ...readTranslationConfig(mx), globalTargetLang: lang };
      await writeTranslationConfig(mx, next);
    },
    [mx]
  );

  const setRoomConfig = useCallback(
    async (roomId: string, roomConfig: RoomTranslationConfig | null) => {
      const current = readTranslationConfig(mx);
      const rooms = { ...(current.rooms ?? {}) };
      if (roomConfig === null) {
        delete rooms[roomId];
      } else {
        rooms[roomId] = roomConfig;
      }
      await writeTranslationConfig(mx, { ...current, rooms });
    },
    [mx]
  );

  return { config, setGlobalAuto, setGlobalTargetLang, setRoomConfig };
};

/** The effective auto-translate decision for a room (room override beats global). */
export const useRoomAutoTranslate = (roomId: string): { auto: boolean; targetLang: string } => {
  const { config } = useTranslationConfig();
  return useMemo(() => resolveRoomAutoTranslate(config, roomId), [config, roomId]);
};

/** Extract the plain-text body we translate from a text-like message event (reply prefix trimmed). */
export const getEventPlainBody = (mEvent: MatrixEvent): string | null => {
  const content = mEvent.getContent() as { body?: unknown; msgtype?: unknown };
  if (typeof content.body !== 'string') return null;
  const { msgtype } = content;
  // Only translate human text-ish messages.
  if (msgtype !== 'm.text' && msgtype !== 'm.notice' && msgtype !== 'm.emote') return null;
  const body = trimReplyFromBody(content.body).trim();
  return body.length > 0 ? body : null;
};

export type EventTranslationState = {
  supported: boolean; // translation configured AND this event has translatable text
  targetLang: string;
  loading: boolean;
  error: string | null;
  result: TranslateResult | null;
  shown: boolean; // whether the translation is currently displayed under the message
  translate: (lang?: string) => void; // trigger/toggle a manual translation
  hide: () => void;
};

/**
 * Translate a single message event. Handles the per-message button flow and the auto-translate
 * flow. Caching lives in translateApi (per event+target), so re-renders never re-hit the backend.
 */
export const useEventTranslation = (mEvent: MatrixEvent, roomId: string): EventTranslationState => {
  const settings = useTranslationSettings();
  const { auto, targetLang: autoTarget } = useRoomAutoTranslate(roomId);

  const eventId = mEvent.getId() ?? '';
  const body = useMemo(() => getEventPlainBody(mEvent), [mEvent]);
  const supported = Boolean(settings) && body !== null;

  const [targetLang, setTargetLang] = useState<string>(autoTarget || DEFAULT_TARGET_LANG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [shown, setShown] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    (lang: string) => {
      if (!settings || body === null) return;
      // serve from cache instantly if present
      const cached = getCachedTranslation(eventId, lang);
      if (cached) {
        setResult(cached);
        setTargetLang(lang);
        setShown(true);
        setError(null);
        setLoading(false);
        return;
      }
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);
      setTargetLang(lang);
      translateText(settings, body, lang, { eventId, signal: ctrl.signal })
        .then((r) => {
          setResult(r);
          setShown(true);
          setLoading(false);
        })
        .catch((e) => {
          if (ctrl.signal.aborted) return;
          setError(e?.message || 'Translation failed');
          setLoading(false);
        });
    },
    [settings, body, eventId]
  );

  const translate = useCallback(
    (lang?: string) => {
      // toggle off if already showing the same language
      if (shown && (!lang || lang === targetLang)) {
        setShown(false);
        return;
      }
      run(lang || targetLang || DEFAULT_TARGET_LANG);
    },
    [run, shown, targetLang]
  );

  const hide = useCallback(() => setShown(false), []);

  // Auto-translate: when enabled for the room, translate incoming messages into the target lang
  // automatically (once per event+target; the cache guards against repeats). We skip the user's
  // OWN messages — there is no value translating what they just wrote.
  const mx = useMatrixClient();
  const isOwnMessage = mEvent.getSender() === mx.getUserId();
  useEffect(() => {
    if (!auto || !supported || !settings || body === null || isOwnMessage) return;
    run(autoTarget || DEFAULT_TARGET_LANG);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, autoTarget, supported, eventId, isOwnMessage]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  return {
    supported,
    targetLang,
    loading,
    error,
    result,
    shown,
    translate,
    hide,
  };
};
