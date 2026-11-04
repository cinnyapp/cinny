// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { createSpaceModalAtom, CreateSpaceModalState } from '../createSpaceModal';

export const useCreateSpaceModalState = (): CreateSpaceModalState | undefined => {
  const data = useAtomValue(createSpaceModalAtom);

  return data;
};

type CloseCallback = () => void;
export const useCloseCreateSpaceModal = (): CloseCallback => {
  const setSettings = useSetAtom(createSpaceModalAtom);

  const close: CloseCallback = useCallback(() => {
    setSettings(undefined);
  }, [setSettings]);

  return close;
};

type OpenCallback = (space?: string) => void;
export const useOpenCreateSpaceModal = (): OpenCallback => {
  const setSettings = useSetAtom(createSpaceModalAtom);

  const open: OpenCallback = useCallback(
    (spaceId) => {
      setSettings({ spaceId });
    },
    [setSettings]
  );

  return open;
};
