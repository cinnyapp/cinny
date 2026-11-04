// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { createContext, useContext } from 'react';
import { OpenedSidebarFolderAtom } from '../openedSidebarFolder';

const OpenedSidebarFolderAtomContext = createContext<OpenedSidebarFolderAtom | null>(null);
export const OpenedSidebarFolderProvider = OpenedSidebarFolderAtomContext.Provider;

export const useOpenedSidebarFolderAtom = (): OpenedSidebarFolderAtom => {
  const anAtom = useContext(OpenedSidebarFolderAtomContext);

  if (!anAtom) {
    throw new Error('OpenedSidebarFolderAtom is not provided!');
  }

  return anAtom;
};
