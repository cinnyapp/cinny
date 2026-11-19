/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { createContext, useContext } from 'react';
import { ClosedLobbyCategoriesAtom } from '../closedLobbyCategories';

const ClosedLobbyCategoriesAtomContext = createContext<ClosedLobbyCategoriesAtom | null>(null);
export const ClosedLobbyCategoriesProvider = ClosedLobbyCategoriesAtomContext.Provider;

export const useClosedLobbyCategoriesAtom = (): ClosedLobbyCategoriesAtom => {
  const anAtom = useContext(ClosedLobbyCategoriesAtomContext);

  if (!anAtom) {
    throw new Error('ClosedLobbyCategoriesAtom is not provided!');
  }

  return anAtom;
};
