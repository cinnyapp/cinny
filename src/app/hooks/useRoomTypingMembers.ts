import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { roomIdToTypingMembersAtom, selectRoomTypingMembersAtom } from '../state/typingMembers';

export const useRoomTypingMember = (roomId: string) => {
  const typing = useAtomValue(
    useMemo(() => selectRoomTypingMembersAtom(roomId, roomIdToTypingMembersAtom), [roomId])
  );
  return typing;
};
