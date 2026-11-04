/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { createContext, useContext } from 'react';
import { NavToActivePathAtom } from '../navToActivePath';

const NavToActivePathAtomContext = createContext<NavToActivePathAtom | null>(null);
export const NavToActivePathProvider = NavToActivePathAtomContext.Provider;

export const useNavToActivePathAtom = (): NavToActivePathAtom => {
  const anAtom = useContext(NavToActivePathAtomContext);

  if (!anAtom) {
    throw new Error('NavToActivePathAtom is not provided!');
  }

  return anAtom;
};
