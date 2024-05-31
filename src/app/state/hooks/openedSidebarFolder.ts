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
