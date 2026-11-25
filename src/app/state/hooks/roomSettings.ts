/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { roomSettingsAtom, RoomSettingsPageData, RoomSettingsState } from '../roomSettings';

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

type OpenCallback = (roomId: string, space?: string, pageData?: RoomSettingsPageData) => void;
export const useOpenRoomSettings = (): OpenCallback => {
  const setSettings = useSetAtom(roomSettingsAtom);

  const open: OpenCallback = useCallback(
    (roomId, spaceId, pageData) => {
      setSettings({ roomId, spaceId, pageData });
    },
    [setSettings]
  );

  return open;
};
