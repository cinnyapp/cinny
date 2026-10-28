import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { allInvitesAtom } from '../../state/room-list/inviteList';
import { isDirectInvite } from '../../utils/room';
import { addRoomIdToMDirect } from '../../utils/matrix';
import { friendsAtom } from './useFriends';
import { friendDMInvitesToAccept, InviteInfo } from './friendDMInvites';

// Rooms already tried this page load, so a failed join isn't retried in a loop.
// A failed invite stays in the Inbox and is retried after a reload.
const attempted = new Set<string>();

// Joins DM invites from accepted friends, like clicking Accept in the Inbox.
// Mount alongside useFriendsPoller.
export const useAutoAcceptFriendDMs = (): void => {
  const mx = useMatrixClient();
  const inviteIds = useAtomValue(allInvitesAtom);
  const { lists } = useAtomValue(friendsAtom);

  useEffect(() => {
    const myUserId = mx.getUserId();
    if (!lists || !myUserId) return;

    const friendIds = new Set(lists.friends.map((f) => f.userId));
    const invites: InviteInfo[] = inviteIds.map((roomId) => {
      const room = mx.getRoom(roomId);
      return {
        roomId,
        isDirect: isDirectInvite(room, myUserId),
        inviter: room?.getMember(myUserId)?.events.member?.getSender(),
      };
    });

    friendDMInvitesToAccept(invites, friendIds, attempted).forEach(({ roomId, inviter }) => {
      attempted.add(roomId);
      mx.joinRoom(roomId)
        .then(() => addRoomIdToMDirect(mx, roomId, inviter))
        .catch((e: unknown) => {
          // eslint-disable-next-line no-console
          console.warn(`Couldn't auto-accept the DM invite from ${inviter}`, e);
        });
    });
  }, [mx, inviteIds, lists]);
};
