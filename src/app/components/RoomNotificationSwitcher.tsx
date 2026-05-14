import { Box, config, Icon, Menu, MenuItem, PopOut, RectCords, Text } from 'folds';
import React, { MouseEventHandler, ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FocusTrap from 'focus-trap-react';
import { stopPropagation } from '../utils/keyboard';
import {
  getRoomNotificationModeIcon,
  RoomNotificationMode,
  useSetRoomNotificationPreference,
} from '../hooks/useRoomsNotificationPreferences';
import { AsyncStatus } from '../hooks/useAsyncCallback';

const useRoomNotificationModes = (): RoomNotificationMode[] =>
  useMemo(
    () => [
      RoomNotificationMode.Unset,
      RoomNotificationMode.AllMessages,
      RoomNotificationMode.SpecialMessages,
      RoomNotificationMode.Mute,
    ],
    []
  );

const useRoomNotificationModeStr = (): Record<RoomNotificationMode, string> => {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      [RoomNotificationMode.Unset]: t('room.notifDefault'),
      [RoomNotificationMode.AllMessages]: t('room.notifAllMessages'),
      [RoomNotificationMode.SpecialMessages]: t('room.notifMentionKeywords'),
      [RoomNotificationMode.Mute]: t('room.notifMute'),
    }),
    [t]
  );
};

type NotificationModeSwitcherProps = {
  roomId: string;
  value?: RoomNotificationMode;
  children: (
    handleOpen: MouseEventHandler<HTMLButtonElement>,
    opened: boolean,
    changing: boolean
  ) => ReactNode;
};
export function RoomNotificationModeSwitcher({
  roomId,
  value = RoomNotificationMode.Unset,
  children,
}: NotificationModeSwitcherProps) {
  const modes = useRoomNotificationModes();
  const modeToStr = useRoomNotificationModeStr();

  const { modeState, setMode } = useSetRoomNotificationPreference(roomId);
  const changing = modeState.status === AsyncStatus.Loading;

  const [menuCords, setMenuCords] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleClose = () => {
    setMenuCords(undefined);
  };

  const handleSelect = (mode: RoomNotificationMode) => {
    if (changing) return;
    setMode(mode, value);
    handleClose();
  };

  return (
    <PopOut
      anchor={menuCords}
      offset={5}
      position="Right"
      align="Start"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: handleClose,
            clickOutsideDeactivates: true,
            isKeyForward: (evt: KeyboardEvent) =>
              evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
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
                  aria-pressed={mode === value}
                  radii="300"
                  disabled={changing}
                  onClick={() => handleSelect(mode)}
                  before={
                    <Icon
                      size="100"
                      src={getRoomNotificationModeIcon(mode)}
                      filled={mode === value}
                    />
                  }
                >
                  <Text size="T300">
                    {mode === value ? <b>{modeToStr[mode]}</b> : modeToStr[mode]}
                  </Text>
                </MenuItem>
              ))}
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      {children(handleOpenMenu, !!menuCords, changing)}
    </PopOut>
  );
}
