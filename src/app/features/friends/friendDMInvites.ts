export type InviteInfo = {
  roomId: string;
  isDirect: boolean;
  // Sender of my invite membership event, as recorded by the homeserver.
  inviter?: string;
};

export type FriendDMInvite = { roomId: string; inviter: string };

// DM invites sent by an accepted friend that haven't been tried yet.
export const friendDMInvitesToAccept = (
  invites: InviteInfo[],
  friendIds: ReadonlySet<string>,
  attempted: ReadonlySet<string>
): FriendDMInvite[] =>
  invites.flatMap(({ roomId, isDirect, inviter }) =>
    isDirect && inviter && friendIds.has(inviter) && !attempted.has(roomId)
      ? [{ roomId, inviter }]
      : []
  );
