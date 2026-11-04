// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { createContext, useContext } from 'react';
import { ClosedNavCategoriesAtom } from '../closedNavCategories';

const ClosedNavCategoriesAtomContext = createContext<ClosedNavCategoriesAtom | null>(null);
export const ClosedNavCategoriesProvider = ClosedNavCategoriesAtomContext.Provider;

export const useClosedNavCategoriesAtom = (): ClosedNavCategoriesAtom => {
  const anAtom = useContext(ClosedNavCategoriesAtomContext);

  if (!anAtom) {
    throw new Error('ClosedNavCategoriesAtom is not provided!');
  }

  return anAtom;
};
