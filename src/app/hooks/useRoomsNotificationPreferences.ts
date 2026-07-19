import { createContext, useCallback, useContext, useMemo } from 'react';
import { AccountDataEvent, PushRules } from 'neurone/lib/api/types';
import { deletePushRule, putPushRule } from 'neurone/lib/api/matrix/client/v3/pushrules';
import { Icons, IconSrc } from 'folds';
import { isRoomId } from '../utils/matrix';
import {
  getNotificationMode,
  getNotificationModeActions,
  NotificationMode,
} from './useNotificationMode';
import { useAsyncCallback } from './useAsyncCallback';
import { useAccountData } from './storage/useAccountData';
import { ClientContext } from '../../client/context';
import { useClient } from './useClient';
import { AccountDataType, ConditionKind } from '../../types/matrix/accountData';

export type RoomsNotificationPreferences = {
  mute: Set<string>;
  specialMessages: Set<string>;
  allMessages: Set<string>;
};

const RoomsNotificationPreferencesContext = createContext<RoomsNotificationPreferences | null>(
  null
);
export const RoomsNotificationPreferencesProvider = RoomsNotificationPreferencesContext.Provider;

export const useRoomsNotificationPreferencesContext = (): RoomsNotificationPreferences => {
  const preferences = useContext(RoomsNotificationPreferencesContext);

  if (!preferences) {
    throw new Error('No RoomsNotificationPreferences provided!');
  }

  return preferences;
};

export const useRoomsNotificationPreferences = (): RoomsNotificationPreferences => {
  const { value: pushRulesEvent } = useAccountData<AccountDataEvent<PushRules>>(
    AccountDataType.PushRules
  );
  const pushRules = pushRulesEvent?.content;

  const preferences: RoomsNotificationPreferences = useMemo(() => {
    const global = pushRules?.global;
    const room = global?.room ?? [];
    const override = global?.override ?? [];

    const pref: RoomsNotificationPreferences = {
      mute: new Set(),
      specialMessages: new Set(),
      allMessages: new Set(),
    };

    override.forEach((rule) => {
      if (isRoomId(rule.rule_id) && getNotificationMode(rule.actions) === NotificationMode.OFF) {
        pref.mute.add(rule.rule_id);
      }
    });
    room.forEach((rule) => {
      if (getNotificationMode(rule.actions) === NotificationMode.OFF) {
        pref.specialMessages.add(rule.rule_id);
      }
    });
    room.forEach((rule) => {
      if (getNotificationMode(rule.actions) !== NotificationMode.OFF) {
        pref.allMessages.add(rule.rule_id);
      }
    });

    return pref;
  }, [pushRules]);

  return preferences;
};

export enum RoomNotificationMode {
  Unset = 'Unset',
  Mute = 'Mute',
  SpecialMessages = 'SpecialMessages',
  AllMessages = 'AllMessages',
}

export const getRoomNotificationMode = (
  preferences: RoomsNotificationPreferences,
  roomId: string
): RoomNotificationMode => {
  if (preferences.mute.has(roomId)) {
    return RoomNotificationMode.Mute;
  }
  if (preferences.specialMessages.has(roomId)) {
    return RoomNotificationMode.SpecialMessages;
  }
  if (preferences.allMessages.has(roomId)) {
    return RoomNotificationMode.AllMessages;
  }

  return RoomNotificationMode.Unset;
};

export const useRoomNotificationPreference = (
  preferences: RoomsNotificationPreferences,
  roomId: string
): RoomNotificationMode =>
  useMemo(() => getRoomNotificationMode(preferences, roomId), [preferences, roomId]);

export const getRoomNotificationModeIcon = (mode?: RoomNotificationMode): IconSrc => {
  if (mode === RoomNotificationMode.Mute) return Icons.BellMute;
  if (mode === RoomNotificationMode.SpecialMessages) return Icons.BellPing;
  if (mode === RoomNotificationMode.AllMessages) return Icons.BellRing;

  return Icons.Bell;
};

export const setRoomNotificationPreference = async (
  ct: ClientContext,
  roomId: string,
  mode: RoomNotificationMode,
  previousMode: RoomNotificationMode
): Promise<void> => {
  // remove the old preference
  if (
    previousMode === RoomNotificationMode.AllMessages ||
    previousMode === RoomNotificationMode.SpecialMessages
  ) {
    await ct.requestAuthJSON(
      deletePushRule({
        pathParams: {
          scope: 'global',
          kind: 'room',
          ruleId: roomId,
        },
      })
    );
  }
  if (previousMode === RoomNotificationMode.Mute) {
    await ct.requestAuthJSON(
      deletePushRule({
        pathParams: {
          scope: 'global',
          kind: 'override',
          ruleId: roomId,
        },
      })
    );
  }

  // set new preference
  if (mode === RoomNotificationMode.Unset) {
    return;
  }

  if (mode === RoomNotificationMode.Mute) {
    await ct.requestAuthJSON(
      putPushRule({
        pathParams: {
          scope: 'global',
          kind: 'override',
          ruleId: roomId,
        },
        body: {
          conditions: [
            {
              kind: ConditionKind.EventMatch,
              key: 'room_id',
              pattern: roomId,
            },
          ],
          actions: getNotificationModeActions(NotificationMode.OFF),
        },
      })
    );
    return;
  }

  await ct.requestAuthJSON(
    putPushRule({
      pathParams: {
        scope: 'global',
        kind: 'room',
        ruleId: roomId,
      },
      body: {
        actions:
          mode === RoomNotificationMode.AllMessages
            ? getNotificationModeActions(NotificationMode.NotifyLoud)
            : getNotificationModeActions(NotificationMode.OFF),
      },
    })
  );
};

export const useSetRoomNotificationPreference = (roomId: string) => {
  const ct = useClient();

  const [modeState, setMode] = useAsyncCallback(
    useCallback(
      (mode: RoomNotificationMode, previousMode: RoomNotificationMode) =>
        setRoomNotificationPreference(ct, roomId, mode, previousMode),
      [ct, roomId]
    )
  );

  return {
    modeState,
    setMode,
  };
};
