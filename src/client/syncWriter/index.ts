import { GetSyncOK } from 'neurone/lib/api/matrix/client/v3/sync';
import { PresenceEvent, StatusContent } from 'neurone/lib/api/types';
import { ClientContext } from '../context';
import {
  deleteInviteRooms,
  deleteJoinRooms,
  deleteKnockRooms,
  deleteLeaveRooms,
  getStaleJoinRooms,
  getStaleInviteRooms,
  getStaleKnockRooms,
  getStaleLeaveRooms,
  writeAccountData,
  writeInviteRoomState,
  writeJoinAccountData,
  writeJoinRoomLatestEvent,
  writeJoinRoomMember,
  writeJoinRoomState,
  writeJoinRoomSummary,
  writeKnockRoomState,
  writeLeaveAccountData,
  writeLeaveRoomState,
  writePresence,
  writeReadReceipt,
  writeUnreadNotifications,
  writeUnreadThreadNotifications,
  writeJoinRoomSticky,
} from './utils';
import { sessionValue } from '../storage/collections';

/**
 * Utility function to find common element between two arrays
 */
const common = <T>(arr1: T[], arr2: T[]): T[] => arr1.filter((item) => arr2.includes(item));

export const writeSync = async (ct: ClientContext, data: GetSyncOK): Promise<void> => {
  const { account_data: accountData, rooms, presence } = data;

  if (accountData?.events && accountData.events.length > 0) {
    await writeAccountData(ct, accountData.events);
  }

  const { join, invite, knock, leave } = rooms ?? {};

  if (join) {
    const joinRooms = Object.keys(join);
    const newRooms = joinRooms.filter((r) => !ct.rooms.join.read.includes(r));

    if (newRooms.length > 0) {
      ct.storage.sessionValue.write.put({
        id: sessionValue.pendingMemberRooms.id,
        value: ct.pendingMemberRooms.read.concat(newRooms),
      });
    }

    await deleteJoinRooms(ct, getStaleJoinRooms(ct, joinRooms, join));
    await deleteInviteRooms(ct, common(joinRooms, ct.rooms.invite.read));
    await deleteKnockRooms(ct, common(joinRooms, ct.rooms.knock.read));
    await deleteLeaveRooms(ct, common(joinRooms, ct.rooms.leave.read));

    await writeJoinAccountData(ct, joinRooms, join);
    await writeJoinRoomSummary(ct, joinRooms, join);
    await writeJoinRoomState(ct, joinRooms, join);
    await writeJoinRoomSticky(ct, joinRooms, join);
    await writeJoinRoomMember(ct, joinRooms, join);
    await writeJoinRoomLatestEvent(ct, joinRooms, join);

    await writeReadReceipt(ct, joinRooms, join);

    await writeUnreadNotifications(ct, joinRooms, join);
    await writeUnreadThreadNotifications(ct, joinRooms, join);
  }

  if (invite) {
    const inviteRooms = Object.keys(invite);

    await deleteInviteRooms(ct, getStaleInviteRooms(ct, inviteRooms, invite));
    await deleteJoinRooms(ct, common(inviteRooms, ct.rooms.join.read));
    await deleteKnockRooms(ct, common(inviteRooms, ct.rooms.knock.read));
    await deleteLeaveRooms(ct, common(inviteRooms, ct.rooms.leave.read));

    await writeInviteRoomState(ct, inviteRooms, invite);
  }

  if (knock) {
    const knockRooms = Object.keys(knock);

    await deleteKnockRooms(ct, getStaleKnockRooms(ct, knockRooms, knock));
    await deleteJoinRooms(ct, common(knockRooms, ct.rooms.join.read));
    await deleteInviteRooms(ct, common(knockRooms, ct.rooms.invite.read));
    await deleteLeaveRooms(ct, common(knockRooms, ct.rooms.leave.read));

    await writeKnockRoomState(ct, knockRooms, knock);
  }

  if (leave) {
    const leaveRooms = Object.keys(leave);

    await deleteLeaveRooms(ct, getStaleLeaveRooms(ct, leaveRooms, leave));
    await deleteJoinRooms(ct, common(leaveRooms, ct.rooms.join.read));
    await deleteInviteRooms(ct, common(leaveRooms, ct.rooms.invite.read));
    await deleteKnockRooms(ct, common(leaveRooms, ct.rooms.knock.read));

    await writeLeaveAccountData(ct, leaveRooms, leave);
    await writeLeaveRoomState(ct, leaveRooms, leave);
  }

  if (presence?.events) {
    const presenceEvents = presence.events.filter(
      (event) => event.type === 'm.presence'
    ) as PresenceEvent<StatusContent>[];

    await writePresence(ct, presenceEvents);
  }
};
