import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useCallback } from 'react';
import { IRoomIdToTypingMembers, roomIdToTypingMembersAtom } from '../state/typingMembers';

const equalTypingMembers = (x: string[], y: string[]): boolean => {
  if (x.length !== y.length) return false;
  return x.every((a, i) => a[1] === y[i]);
};

export const useRoomTypingMember = (roomId: string) => {
  const selector = useCallback(
    (roomToTyping: IRoomIdToTypingMembers) => roomToTyping.get(roomId) ?? [],
    [roomId]
  );

  const typing = useAtomValue(selectAtom(roomIdToTypingMembersAtom, selector, equalTypingMembers));
  return typing;
};
