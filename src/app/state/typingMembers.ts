import { atom, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import {
  MatrixClient,
  RoomMember,
  RoomMemberEvent,
  RoomMemberEventHandlerMap,
} from 'matrix-js-sdk';
import { useEffect } from 'react';

export type IRoomIdToTypingMembers = Map<string, RoomMember[]>;

export type IRoomIdToTypingMembersAction =
  | {
      type: 'PUT';
      roomId: string;
      member: RoomMember;
    }
  | {
      type: 'DELETE';
      roomId: string;
      member: RoomMember;
    };

const baseRoomIdToTypingMembersAtom = atom<IRoomIdToTypingMembers>(new Map());
export const roomIdToTypingMembersAtom = atom<
  IRoomIdToTypingMembers,
  [IRoomIdToTypingMembersAction],
  undefined
>(
  (get) => get(baseRoomIdToTypingMembersAtom),
  (get, set, action) => {
    const roomIdToTypingMembers = get(baseRoomIdToTypingMembersAtom);
    let typingMembers = roomIdToTypingMembers.get(action.roomId) ?? [];

    typingMembers = typingMembers.filter((member) => member.userId !== action.member.userId);

    if (action.type === 'PUT') {
      typingMembers = [...typingMembers, action.member];
    }
    roomIdToTypingMembers.set(action.roomId, typingMembers);
    set(baseRoomIdToTypingMembersAtom, new Map([...roomIdToTypingMembers]));
  }
);

export const useBindRoomIdToTypingMembersAtom = (
  mx: MatrixClient,
  typingMembersAtom: typeof roomIdToTypingMembersAtom
) => {
  const setTypingMembers = useSetAtom(typingMembersAtom);

  useEffect(() => {
    const handleTypingEvent: RoomMemberEventHandlerMap[RoomMemberEvent.Typing] = (
      event,
      member
    ) => {
      setTypingMembers({
        type: member.typing ? 'PUT' : 'DELETE',
        roomId: member.roomId,
        member,
      });
    };

    mx.on(RoomMemberEvent.Typing, handleTypingEvent);
    return () => {
      mx.removeListener(RoomMemberEvent.Typing, handleTypingEvent);
    };
  }, [mx, setTypingMembers]);
};

export const selectRoomTypingMembersAtom = (
  roomId: string,
  typingMembersAtom: typeof roomIdToTypingMembersAtom
) => selectAtom(typingMembersAtom, (atoms) => atoms.get(roomId) ?? []);
