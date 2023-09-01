import { atom } from 'jotai';

export enum SidebarTab {
  Home = 'Home',
  People = 'People',
}

export const selectedTabAtom = atom<SidebarTab | string>(SidebarTab.Home);
