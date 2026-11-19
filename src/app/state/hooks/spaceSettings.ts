/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { spaceSettingsAtom, SpaceSettingsPage, SpaceSettingsState } from '../spaceSettings';

export const useSpaceSettingsState = (): SpaceSettingsState | undefined => {
  const data = useAtomValue(spaceSettingsAtom);

  return data;
};

type CloseCallback = () => void;
export const useCloseSpaceSettings = (): CloseCallback => {
  const setSettings = useSetAtom(spaceSettingsAtom);

  const close: CloseCallback = useCallback(() => {
    setSettings(undefined);
  }, [setSettings]);

  return close;
};

type OpenCallback = (roomId: string, space?: string, page?: SpaceSettingsPage) => void;
export const useOpenSpaceSettings = (): OpenCallback => {
  const setSettings = useSetAtom(spaceSettingsAtom);

  const open: OpenCallback = useCallback(
    (roomId, spaceId, page) => {
      setSettings({ roomId, spaceId, page });
    },
    [setSettings]
  );

  return open;
};
