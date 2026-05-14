import {
  Box,
  Button,
  config,
  Icon,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Spinner,
  Text,
} from 'folds';
import { IPushRule } from 'matrix-js-sdk';
import React, { MouseEventHandler, useMemo, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { useTranslation } from 'react-i18next';
import { NotificationMode, useNotificationActionsMode } from '../../../hooks/useNotificationMode';
import { stopPropagation } from '../../../utils/keyboard';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';

export const useNotificationModes = (): NotificationMode[] =>
  useMemo(() => [NotificationMode.NotifyLoud, NotificationMode.Notify, NotificationMode.OFF], []);

const useNotificationModeStr = (): Record<NotificationMode, string> => {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      [NotificationMode.OFF]: t('settings.notificationSettings.disable'),
      [NotificationMode.Notify]: t('settings.notificationSettings.notifySilent'),
      [NotificationMode.NotifyLoud]: t('settings.notificationSettings.notifyLoud'),
    }),
    [t]
  );
};

type NotificationModeSwitcherProps = {
  pushRule: IPushRule;
  onChange: (mode: NotificationMode) => Promise<void>;
};
export function NotificationModeSwitcher({ pushRule, onChange }: NotificationModeSwitcherProps) {
  const modes = useNotificationModes();
  const modeToStr = useNotificationModeStr();
  const selectedMode = useNotificationActionsMode(pushRule.actions);
  const [changeState, change] = useAsyncCallback(onChange);
  const changing = changeState.status === AsyncStatus.Loading;

  const [menuCords, setMenuCords] = useState<RectCords>();

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleSelect = (mode: NotificationMode) => {
    setMenuCords(undefined);
    change(mode);
  };

  return (
    <>
      <Button
        size="300"
        variant="Secondary"
        outlined
        fill="Soft"
        radii="300"
        after={
          changing ? (
            <Spinner variant="Secondary" size="300" />
          ) : (
            <Icon size="300" src={Icons.ChevronBottom} />
          )
        }
        onClick={handleMenu}
        disabled={changing}
      >
        <Text size="T300">{modeToStr[selectedMode]}</Text>
      </Button>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setMenuCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                {modes.map((mode) => (
                  <MenuItem
                    key={mode}
                    size="300"
                    variant="Surface"
                    aria-selected={mode === selectedMode}
                    radii="300"
                    onClick={() => handleSelect(mode)}
                  >
                    <Box grow="Yes">
                      <Text size="T300">{modeToStr[mode]}</Text>
                    </Box>
                  </MenuItem>
                ))}
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </>
  );
}
