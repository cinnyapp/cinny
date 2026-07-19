import { PushRuleAction } from 'neurone/lib/api/types';
import { useCallback, useMemo } from 'react';

export enum NotificationMode {
  OFF = 'OFF',
  Notify = 'Notify',
  NotifyLoud = 'NotifyLoud',
}

export enum PushRuleActionName {
  DontNotify = 'dont_notify',
  Notify = 'notify',
}

export enum TweakName {
  Highlight = 'highlight',
  Sound = 'sound',
}

export const getNotificationMode = (actions: PushRuleAction[]): NotificationMode => {
  const soundTweak = actions.find(
    (action) =>
      typeof action === 'object' && 'set_tweak' in action && action.set_tweak === TweakName.Sound
  );
  const notify = actions.find(
    (action) => typeof action === 'string' && action === PushRuleActionName.Notify
  );

  if (notify && soundTweak) return NotificationMode.NotifyLoud;
  if (notify) return NotificationMode.Notify;
  return NotificationMode.OFF;
};

export type NotificationModeOptions = {
  soundValue?: string;
  highlight?: boolean;
};
export const getNotificationModeActions = (
  mode: NotificationMode,
  options?: NotificationModeOptions
): PushRuleAction[] => {
  if (mode === NotificationMode.OFF) return [];

  const actions: PushRuleAction[] = [PushRuleActionName.Notify];

  if (mode === NotificationMode.NotifyLoud) {
    actions.push({
      set_tweak: TweakName.Sound,
      value: options?.soundValue ?? 'default',
    });
  }

  if (options?.highlight) {
    actions.push({
      set_tweak: TweakName.Highlight,
      value: true,
    });
  }

  return actions;
};

export type GetNotificationModeCallback = (mode: NotificationMode) => PushRuleAction[];
export const useNotificationModeActions = (
  options?: NotificationModeOptions
): GetNotificationModeCallback => {
  const getAction: GetNotificationModeCallback = useCallback(
    (mode) => getNotificationModeActions(mode, options),
    [options]
  );

  return getAction;
};

export const useNotificationActionsMode = (actions: PushRuleAction[]): NotificationMode => {
  const mode: NotificationMode = useMemo(() => getNotificationMode(actions), [actions]);

  return mode;
};
