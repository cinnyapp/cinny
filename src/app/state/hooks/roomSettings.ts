// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { roomSettingsAtom, RoomSettingsPage, RoomSettingsState } from '../roomSettings';

export const useRoomSettingsState = (): RoomSettingsState | undefined => {
  const data = useAtomValue(roomSettingsAtom);

  return data;
};

type CloseCallback = () => void;
export const useCloseRoomSettings = (): CloseCallback => {
  const setSettings = useSetAtom(roomSettingsAtom);

  const close: CloseCallback = useCallback(() => {
    setSettings(undefined);
  }, [setSettings]);

  return close;
};

type OpenCallback = (roomId: string, space?: string, page?: RoomSettingsPage) => void;
export const useOpenRoomSettings = (): OpenCallback => {
  const setSettings = useSetAtom(roomSettingsAtom);

  const open: OpenCallback = useCallback(
    (roomId, spaceId, page) => {
      setSettings({ roomId, spaceId, page });
    },
    [setSettings]
  );

  return open;
};
