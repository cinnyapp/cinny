import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useCallback } from 'react';
import {
  IRoomIdToTypingMembers,
  TypingReceipt,
  roomIdToTypingMembersAtom,
} from '../state/typingMembers';

const typingReceiptEqual = (a: TypingReceipt, b: TypingReceipt): boolean =>
  a.userId === b.userId && a.ts === b.ts;

const equalTypingMembers = (x: TypingReceipt[], y: TypingReceipt[]): boolean => {
  if (x.length !== y.length) return false;
  return x.every((a, i) => typingReceiptEqual(a, y[i]));
};

export const useRoomTypingMember = (roomId: string) => {
  const selector = useCallback(
    (roomToTyping: IRoomIdToTypingMembers) => roomToTyping.get(roomId) ?? [],
    [roomId]
  );

  const typing = useAtomValue(selectAtom(roomIdToTypingMembersAtom, selector, equalTypingMembers));
  return typing;
};
