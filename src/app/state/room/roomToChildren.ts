import { atom } from 'jotai';
import { roomToParentsAtom } from './roomToParents';

export const roomToChildrenAtom = atom((get) => {
  const roomToParents = get(roomToParentsAtom);
  const map = new Map<string, Set<string>>();

  roomToParents.forEach((parentSet, childId) => {
    parentSet.forEach((parentId) => {
      if (!map.has(parentId)) map.set(parentId, new Set());
      map.get(parentId)?.add(childId);
    });
  });

  return map;
});
