import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { useAccountData } from './useAccountData';
import { useMatrixClient } from './useMatrixClient';
import { isSpace } from '../utils/room';
import { Membership } from '../../types/matrix/room';
import { useAccountDataCallback } from './useAccountDataCallback';

export type ISidebarFolder = {
  name?: string;
  id: string;
  content: string[];
};
export type TSidebarItem = string | ISidebarFolder;
export type SidebarItems = Array<TSidebarItem>;

export type InCinnySpacesContent = {
  shortcut?: string[];
  sidebar?: SidebarItems;
};

export const parseSidebar = (
  mx: MatrixClient,
  orphanSpaces: string[],
  content?: InCinnySpacesContent
) => {
  const sidebar = content?.sidebar ?? content?.shortcut ?? [];
  const orphans = new Set(orphanSpaces);

  const items: SidebarItems = [];

  const safeToAdd = (spaceId: string): boolean => {
    if (typeof spaceId !== 'string') return false;
    const space = mx.getRoom(spaceId);
    if (space?.getMyMembership() !== Membership.Join) return false;
    return isSpace(space);
  };

  sidebar.forEach((item) => {
    if (typeof item === 'string') {
      if (safeToAdd(item) && !items.includes(item)) {
        orphans.delete(item);
        items.push(item);
      }
      return;
    }
    if (
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      Array.isArray(item.content) &&
      !items.find((i) => (typeof i === 'string' ? false : i.id === item.id))
    ) {
      const safeContent = item.content.filter(safeToAdd);
      safeContent.forEach((i) => orphans.delete(i));
      items.push({
        ...item,
        content: Array.from(new Set(safeContent)),
      });
    }
  });

  orphans.forEach((spaceId) => items.push(spaceId));

  return items;
};

export const useSidebarItems = (
  orphanSpaces: string[]
): [SidebarItems, Dispatch<SetStateAction<SidebarItems>>] => {
  const mx = useMatrixClient();
  const inCinnySpacesContent = useAccountData(
    AccountDataEvent.CinnySpaces
  )?.getContent<InCinnySpacesContent>();

  const [sidebarItems, setSidebarItems] = useState(() =>
    parseSidebar(mx, orphanSpaces, inCinnySpacesContent)
  );

  useAccountDataCallback(
    mx,
    useCallback(
      (mEvent) => {
        if (mEvent.getType() === AccountDataEvent.CinnySpaces) {
          const newContent = mEvent.getContent<InCinnySpacesContent>();
          setSidebarItems(parseSidebar(mx, orphanSpaces, newContent));
        }
      },
      [mx, orphanSpaces]
    )
  );

  return [sidebarItems, setSidebarItems];
};
