import { atom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { roomTypingEphemeral } from 'neurone/lib/utils/sync/v3/join';
import { useSetting } from './hooks/settings';
import { ClientContext } from '../../client/context';

export type IRoomIdToTypingMembers = Map<string, string[]>;

export const roomIdToTypingMembersAtom = atom<IRoomIdToTypingMembers>(new Map());

export const useBindRoomIdToTypingMembersAtom = (
  ct: ClientContext,
  typingMembersAtom: typeof roomIdToTypingMembersAtom
) => {
  const setTypingMembers = useSetAtom(typingMembersAtom);
  const [hideActivity] = useSetting('hideActivity');

  useEffect(() => {
    const unsubscribe = ct.sync.observable.subscribe((syncValue) => {
      if (hideActivity) {
        setTypingMembers(new Map());
        return;
      }

      const [, data] = syncValue ?? [];
      const { join } = data?.rooms ?? {};
      if (!join) return;

      const roomToUsers: IRoomIdToTypingMembers = new Map();

      Object.keys(join).forEach((roomId) => {
        const ephemeralEvents = join[roomId].ephemeral?.events;
        const typingEvent = ephemeralEvents && roomTypingEphemeral(ephemeralEvents);
        const users = typingEvent?.content.user_ids ?? [];
        if (users.length > 0) {
          roomToUsers.set(roomId, users);
        }
      });

      setTypingMembers(roomToUsers);
    });

    return unsubscribe;
  }, [ct, setTypingMembers, hideActivity]);
};
