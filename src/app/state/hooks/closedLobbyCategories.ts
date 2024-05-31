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
