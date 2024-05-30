import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { useMatrixClient } from './useMatrixClient';
import { getAccountData, isSpace } from '../utils/room';
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

  const [sidebarItems, setSidebarItems] = useState(() => {
    const inCinnySpacesContent = getAccountData(
      mx,
      AccountDataEvent.CinnySpaces
    )?.getContent<InCinnySpacesContent>();
    return parseSidebar(mx, orphanSpaces, inCinnySpacesContent);
  });

  useEffect(() => {
    const inCinnySpacesContent = getAccountData(
      mx,
      AccountDataEvent.CinnySpaces
    )?.getContent<InCinnySpacesContent>();
    setSidebarItems(parseSidebar(mx, orphanSpaces, inCinnySpacesContent));
  }, [mx, orphanSpaces]);

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

export const sidebarItemWithout = (items: SidebarItems, roomId: string) => {
  const newItems: SidebarItems = items
    .map((item) => {
      if (typeof item === 'string') {
        if (item === roomId) return null;
        return item;
      }
      if (item.content.includes(roomId)) {
        const newContent = item.content.filter((id) => id !== roomId);
        if (newContent.length === 0) return null;
        return {
          ...item,
          content: newContent,
        };
      }
      return item;
    })
    .filter((item) => item !== null) as SidebarItems;

  return newItems;
};

export const makeCinnySpacesContent = (
  mx: MatrixClient,
  items: SidebarItems
): InCinnySpacesContent => {
  const currentInSpaces =
    getAccountData(mx, AccountDataEvent.CinnySpaces)?.getContent<InCinnySpacesContent>() ?? {};

  const newSpacesContent: InCinnySpacesContent = {
    ...currentInSpaces,
    sidebar: items,
  };

  return newSpacesContent;
};
