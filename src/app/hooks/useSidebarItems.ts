import { useMemo } from 'react';
import { AccountDataEvent } from 'neurone/lib/api/types';
import { useClient } from './useClient';
import { ClientContext } from '../../client/context';

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
  ct: ClientContext,
  orphanSpaces: string[],
  content?: InCinnySpacesContent
) => {
  const sidebar = content?.sidebar ?? content?.shortcut ?? [];
  const orphans = new Set(orphanSpaces);

  const items: SidebarItems = [];

  const safeToAdd = (spaceId: string): boolean => {
    if (typeof spaceId !== 'string') return false;
    if (!ct.rooms.join.read.includes(spaceId)) return false;
    return ct.spaceRooms.read.has(spaceId);
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
  orphanSpaces: string[],
  cinnySpacesEvent?: AccountDataEvent<InCinnySpacesContent>
): SidebarItems => {
  const ct = useClient();

  const sidebarItems: SidebarItems = useMemo(() => {
    const content = cinnySpacesEvent?.content;
    return parseSidebar(ct, orphanSpaces, content);
  }, [ct, cinnySpacesEvent, orphanSpaces]);

  return sidebarItems;
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
  items: SidebarItems,
  cinnySpacesEvent?: AccountDataEvent<InCinnySpacesContent>
): InCinnySpacesContent => {
  const content = cinnySpacesEvent?.content ?? {};

  const newSpacesContent: InCinnySpacesContent = {
    ...content,
    sidebar: items,
  };

  return newSpacesContent;
};

export const useSidebarRooms = (sidebarItems: SidebarItems): string[] => {
  const rooms = useMemo(() => {
    const ids = sidebarItems.flatMap((item) => (typeof item === 'string' ? [item] : item.content));
    return Array.from(new Set(ids));
  }, [sidebarItems]);

  return rooms;
};
