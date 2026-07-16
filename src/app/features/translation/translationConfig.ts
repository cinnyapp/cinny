// Persistence for the in-app translation settings, stored in Matrix ACCOUNT DATA so it syncs
// across Chagai's devices (per the task: prefer account data). One global event holds:
//   - global auto-translate on/off + its target language ("everywhere")
//   - a per-room override map (roomId -> { auto, targetLang })
//
// Reading/writing is done with the MatrixClient's account-data API. The event type is namespaced
// under Cinny's own key so it never collides with anything else.

import { MatrixClient } from 'matrix-js-sdk';
import { DEFAULT_TARGET_LANG } from './languages';

export const TRANSLATION_ACCOUNT_DATA_TYPE = 'in.cinny.translation';

export type RoomTranslationConfig = {
  auto?: boolean;
  targetLang?: string;
};

export type TranslationConfig = {
  // "auto-translate all messages everywhere into <globalTargetLang>"
  globalAuto?: boolean;
  globalTargetLang?: string;
  // per-room overrides; a room entry beats the global setting for that room
  rooms?: Record<string, RoomTranslationConfig>;
};

export const emptyTranslationConfig = (): TranslationConfig => ({
  globalAuto: false,
  globalTargetLang: DEFAULT_TARGET_LANG,
  rooms: {},
});

export const readTranslationConfig = (mx: MatrixClient): TranslationConfig => {
  const evt = mx.getAccountData(TRANSLATION_ACCOUNT_DATA_TYPE);
  const content = (evt?.getContent() as TranslationConfig | undefined) ?? {};
  return {
    globalAuto: content.globalAuto ?? false,
    globalTargetLang: content.globalTargetLang ?? DEFAULT_TARGET_LANG,
    rooms: content.rooms ?? {},
  };
};

export const writeTranslationConfig = async (
  mx: MatrixClient,
  config: TranslationConfig
): Promise<void> => {
  await mx.setAccountData(
    TRANSLATION_ACCOUNT_DATA_TYPE,
    config as unknown as Record<string, unknown>
  );
};

/**
 * The effective auto-translate decision for a room, resolving room override over global.
 * Returns { auto, targetLang }.
 */
export const resolveRoomAutoTranslate = (
  config: TranslationConfig,
  roomId: string
): { auto: boolean; targetLang: string } => {
  const room = config.rooms?.[roomId];
  if (room && typeof room.auto === 'boolean') {
    return {
      auto: room.auto,
      targetLang: room.targetLang ?? config.globalTargetLang ?? DEFAULT_TARGET_LANG,
    };
  }
  return {
    auto: config.globalAuto ?? false,
    targetLang: config.globalTargetLang ?? DEFAULT_TARGET_LANG,
  };
};
