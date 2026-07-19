import { InviteRoom, JoinRoom, KnockRoom, LeaveRoom } from 'neurone/lib/api/matrix/client/v3/sync';
import {
  AccountDataEvent,
  PresenceEvent,
  Receipt,
  ReceiptType,
  StatusContent,
} from 'neurone/lib/api/types';
import * as joinRoomUtil from 'neurone/lib/utils/sync/v3/join';
import * as inviteRoomUtil from 'neurone/lib/utils/sync/v3/invite';
import * as knockRoomUtil from 'neurone/lib/utils/sync/v3/knock';
import * as leaveRoomUtil from 'neurone/lib/utils/sync/v3/leave';
import { ObjectReader } from 'neurone/lib/utils';
import { ClientContext } from '../context';
import {
  AccountDataObject,
  equalRoomSummary,
  getInviteRoomStateId,
  getJoinAccountDataId,
  getJoinRoomMemberId,
  getJoinRoomStateId,
  getKnockRoomStateId,
  getLeaveAccountDataId,
  getLeaveRoomStateId,
  getReadReceiptId,
  getUnreadThreadNotificationId,
  InviteRoomStateObject,
  JoinAccountDataObject,
  JoinRoomLatestEventObject,
  JoinRoomMemberObject,
  JoinRoomStateObject,
  JoinRoomSummaryObject,
  KnockRoomStateObject,
  LeaveAccountDataObject,
  LeaveRoomStateObject,
  PresenceObject,
  ReadReceiptObject,
  UnreadNotificationsObject,
  UnreadThreadNotificationsObject,
} from '../storage/collections';
import { ThreadId } from '../../types/matrix/room';

export const writeAccountData = async (
  ct: ClientContext,
  events: AccountDataEvent[]
): Promise<void> => {
  if (events.length > 0) {
    const accountDataObjects: AccountDataObject[] = events.map((event) => {
      const obj: AccountDataObject = {
        id: event.type,
        event,
      };
      return obj;
    });
    await ct.storage.accountData.write.putMultiple(accountDataObjects);
  }
};

export const writeJoinAccountData = async (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): Promise<void> => {
  const accountDataObjects: JoinAccountDataObject[] = joinRooms.flatMap((roomId) => {
    const joinRoom = join[roomId];
    const events = joinRoomUtil.roomAccountData(joinRoom);

    return events.map((event) => {
      const obj: JoinAccountDataObject = {
        id: getJoinAccountDataId(roomId, event.type),
        roomId,
        type: event.type,
        event,
      };

      return obj;
    });
  });

  await ct.storage.joinAccountData.write.putMultiple(accountDataObjects);
};

export const writeJoinRoomSummary = async (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): Promise<void> => {
  const roomSummaryObjects: JoinRoomSummaryObject[] = joinRooms.flatMap((roomId) => {
    const room = join[roomId];
    const summary = joinRoomUtil.roomSummary(room);
    if (!summary) return [];

    const existingSummary = ct.roomToSummary.read.get(roomId);
    const summaryObj: JoinRoomSummaryObject = {
      summary: {
        ...existingSummary,
        ...summary,
      },
      id: roomId,
    };
    if (existingSummary && equalRoomSummary(existingSummary, summaryObj.summary)) {
      return [];
    }

    return [summaryObj];
  });

  await ct.storage.joinRoomSummary.write.putMultiple(roomSummaryObjects);
};

export const writeJoinRoomState = async (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): Promise<void> => {
  const roomStateObjects: JoinRoomStateObject[] = joinRooms.flatMap((roomId) => {
    const joinRoom = join[roomId];
    const events = joinRoomUtil
      .roomState(joinRoom)
      .filter((event) => event.type !== 'm.room.member');

    return events.map((event) => {
      const obj: JoinRoomStateObject = {
        id: getJoinRoomStateId(roomId, event.type, event.state_key),
        roomId,
        type: event.type,
        event,
      };

      return obj;
    });
  });

  await ct.storage.joinRoomState.write.putMultiple(roomStateObjects);
};

export const writeJoinRoomMember = async (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): Promise<void> => {
  const roomMemberObjects: JoinRoomMemberObject[] = joinRooms.flatMap((roomId) => {
    const joinRoom = join[roomId];
    const events = joinRoomUtil
      .roomState(joinRoom)
      .filter((event) => event.type === 'm.room.member');

    return events.map((event) => {
      const obj: JoinRoomMemberObject = {
        id: getJoinRoomMemberId(roomId, event.state_key),
        roomId,
        userId: event.state_key,
        event,
      };

      return obj;
    });
  });

  await ct.storage.joinRoomMember.write.putMultiple(roomMemberObjects);
};

export const writeJoinRoomLatestEvent = async (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): Promise<void> => {
  const roomLatestEventObjects: JoinRoomLatestEventObject[] = [];

  joinRooms.forEach((roomId) => {
    const joinRoom = join[roomId];
    const { events } = joinRoom.timeline ?? {};
    if (!events) return;

    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i];
      if (!('state_key' in event)) {
        roomLatestEventObjects.push({
          id: roomId,
          event,
        });
        break;
      }
    }
  });

  await ct.storage.joinRoomLatestEvent.write.putMultiple(roomLatestEventObjects);
};

export const writeReadReceipt = async (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): Promise<void> => {
  const readReceiptObjects: ReadReceiptObject[] = joinRooms.flatMap((roomId) => {
    const joinRoom = join[roomId];
    const event = joinRoomUtil.roomReceiptEphemeral(joinRoomUtil.roomEphemeral(joinRoom));

    if (!event) return [];

    const objects: ReadReceiptObject[] = [];

    const collectReceipt = (
      eventId: string,
      userId: string,
      receiptType: ReceiptType,
      receipt: Receipt
    ) => {
      const threadId = receipt.thread_id ?? ThreadId.Main;
      const obj: ReadReceiptObject = {
        id: getReadReceiptId(roomId, userId, threadId),
        roomId,
        userId,
        type: receiptType,
        eventId,
        ts: receipt.ts ?? 0,
        threadId,
      };
      objects.push(obj);
    };

    const threadIdToMyPrivateReceipt: Record<
      string,
      {
        eventId: string;
        receipt: Receipt;
      }
    > = {};

    const eventIds = Object.keys(event.content);
    eventIds.forEach((eventId) => {
      const receiptContent = event.content[eventId];
      const userToPrivate = receiptContent['m.read.private'];
      const receipt = userToPrivate?.[ct.session.userId];
      if (!receipt) return;
      const threadId = receipt.thread_id ?? ThreadId.Main;
      const existing = threadIdToMyPrivateReceipt[threadId];
      if (!existing || (receipt.ts ?? 0) > (existing.receipt.ts ?? 0)) {
        threadIdToMyPrivateReceipt[threadId] = { eventId, receipt };
      }
    });
    eventIds.forEach((eventId) => {
      const receiptContent = event.content[eventId];
      const userToPublic = receiptContent['m.read'];

      if (userToPublic) {
        Object.keys(userToPublic).forEach((userId) => {
          const receipt = userToPublic[userId];
          if (userId === ct.session.userId) {
            // use latest receipt between private/public
            const threadId = receipt.thread_id ?? ThreadId.Main;
            const privateReceipt =
              threadId in threadIdToMyPrivateReceipt
                ? threadIdToMyPrivateReceipt[threadId]
                : undefined;
            if (privateReceipt && (privateReceipt.receipt.ts ?? 0) >= (receipt.ts ?? 0)) {
              collectReceipt(
                privateReceipt.eventId,
                userId,
                'm.read.private',
                privateReceipt.receipt
              );
              return;
            }
          }
          collectReceipt(eventId, userId, 'm.read', receipt);
        });
      }
    });

    return objects;
  });

  await ct.storage.readReceipt.write.putMultiple(readReceiptObjects);
};

export const writeUnreadNotifications = async (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): Promise<void> => {
  const existing = await ct.storage.unreadNotifications.read.getMultiple(joinRooms);

  const unreadNotificationsObjects: UnreadNotificationsObject[] = joinRooms.flatMap(
    (roomId, index) => {
      const joinRoom = join[roomId];

      const existingUnread = existing[index]?.unread;
      const unread = joinRoomUtil.roomUnreadNotifications(joinRoom);

      if (
        !unread ||
        (existingUnread?.highlight_count === unread.highlight_count &&
          existingUnread?.notification_count === unread.notification_count)
      ) {
        return [];
      }
      const obj: UnreadNotificationsObject = {
        id: roomId,
        unread,
      };
      return obj;
    }
  );

  await ct.storage.unreadNotifications.write.putMultiple(unreadNotificationsObjects);
};

export const writeUnreadThreadNotifications = async (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): Promise<void> => {
  const unreadThreadNotificationsObjects: UnreadThreadNotificationsObject[] = joinRooms.flatMap(
    (roomId) => {
      const joinRoom = join[roomId];

      const unreadThreadNotifications = joinRoomUtil.roomUnreadThreadNotifications(joinRoom);

      if (!unreadThreadNotifications) {
        return [];
      }

      return Object.keys(unreadThreadNotifications).map((threadId) => {
        const unread = unreadThreadNotifications[threadId];

        const obj: UnreadThreadNotificationsObject = {
          id: getUnreadThreadNotificationId(roomId, threadId),
          roomId,
          threadId,
          unread,
        };

        return obj;
      });
    }
  );

  await ct.storage.unreadThreadNotifications.write.putMultiple(unreadThreadNotificationsObjects);
};

export const writeInviteRoomState = async (
  ct: ClientContext,
  inviteRooms: string[],
  invite: Record<string, InviteRoom>
): Promise<void> => {
  const inviteStateObjects: InviteRoomStateObject[] = inviteRooms.flatMap((roomId) => {
    const inviteRoom = invite[roomId];

    const events = inviteRoomUtil.roomInviteState(inviteRoom);

    return events.map((event) => {
      const obj: InviteRoomStateObject = {
        id: getInviteRoomStateId(roomId, event.type, event.state_key),
        roomId,
        type: event.type,
        event,
      };
      return obj;
    });
  });

  await ct.storage.inviteRoomState.write.putMultiple(inviteStateObjects);
};

export const writeKnockRoomState = async (
  ct: ClientContext,
  knockRooms: string[],
  knock: Record<string, KnockRoom>
): Promise<void> => {
  const knockStateObjects: KnockRoomStateObject[] = knockRooms.flatMap((roomId) => {
    const knockRoom = knock[roomId];

    const events = knockRoomUtil.roomKnockState(knockRoom);

    return events.map((event) => {
      const obj: KnockRoomStateObject = {
        id: getKnockRoomStateId(roomId, event.type, event.state_key),
        roomId,
        type: event.type,
        event,
      };

      return obj;
    });
  });

  await ct.storage.knockRoomState.write.putMultiple(knockStateObjects);
};

export const writeLeaveAccountData = async (
  ct: ClientContext,
  leaveRooms: string[],
  leave: Record<string, LeaveRoom>
): Promise<void> => {
  const leaveAccountDataObjects: LeaveAccountDataObject[] = leaveRooms.flatMap((roomId) => {
    const leaveRoom = leave[roomId];

    const events = leaveRoomUtil.roomAccountData(leaveRoom);

    return events.map((event) => {
      const obj: LeaveAccountDataObject = {
        id: getLeaveAccountDataId(roomId, event.type),
        roomId,
        type: event.type,
        event,
      };

      return obj;
    });
  });

  await ct.storage.leaveAccountData.write.putMultiple(leaveAccountDataObjects);
};

export const writeLeaveRoomState = async (
  ct: ClientContext,
  leaveRooms: string[],
  leave: Record<string, LeaveRoom>
): Promise<void> => {
  const leaveStateObjects: LeaveRoomStateObject[] = leaveRooms.flatMap((roomId) => {
    const leaveRoom = leave[roomId];

    const events = leaveRoomUtil.roomState(leaveRoom);

    return events.map((event) => {
      const obj: LeaveRoomStateObject = {
        id: getLeaveRoomStateId(roomId, event.type, event.state_key),
        roomId,
        type: event.type,
        event,
      };

      return obj;
    });
  });

  await ct.storage.leaveRoomState.write.putMultiple(leaveStateObjects);
};

export const writePresence = async (
  ct: ClientContext,
  events: PresenceEvent<StatusContent>[]
): Promise<void> => {
  if (events.length > 0) {
    const presenceObjects: PresenceObject[] = events.map((event) => {
      const obj: PresenceObject = {
        id: event.sender,
        presence: event.content.presence,
        content: event.content,
      };

      return obj;
    });

    await ct.storage.presence.write.putMultiple(presenceObjects);
  }
};

export const deleteKnockRooms = async (ct: ClientContext, rooms: string[]): Promise<void> => {
  if (rooms.length === 0) return;

  const promises = rooms.map((roomId) =>
    ct.storage.knockRoomState.read.queryIndexKeys('roomId', roomId)
  );

  const result = await Promise.allSettled(promises);
  const keys = result.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);

  await ct.storage.knockRoomState.write.deleteMultiple(keys);
};

export const deleteInviteRooms = async (ct: ClientContext, rooms: string[]): Promise<void> => {
  if (rooms.length === 0) return;

  const promises = rooms.map((roomId) =>
    ct.storage.inviteRoomState.read.queryIndexKeys('roomId', roomId)
  );

  const result = await Promise.allSettled(promises);
  const keys = result.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);

  await ct.storage.inviteRoomState.write.deleteMultiple(keys);
};

export const deleteLeaveRooms = async (ct: ClientContext, rooms: string[]): Promise<void> => {
  if (rooms.length === 0) return;

  const accountDataObjectsId = (
    await Promise.allSettled(
      rooms.map((roomId) => ct.storage.leaveAccountData.read.queryIndexKeys('roomId', roomId))
    )
  )
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  await ct.storage.leaveAccountData.write.deleteMultiple(accountDataObjectsId);

  const roomStateObjectsId = (
    await Promise.allSettled(
      rooms.map((roomId) => ct.storage.leaveRoomState.read.queryIndexKeys('roomId', roomId))
    )
  )
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  await ct.storage.leaveRoomState.write.deleteMultiple(roomStateObjectsId);
};

export const deleteJoinRooms = async (ct: ClientContext, rooms: string[]): Promise<void> => {
  if (rooms.length === 0) return;

  const accountDataObjectsId = (
    await Promise.allSettled(
      rooms.map((roomId) => ct.storage.joinAccountData.read.queryIndexKeys('roomId', roomId))
    )
  )
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  await ct.storage.joinAccountData.write.deleteMultiple(accountDataObjectsId);

  await ct.storage.joinRoomSummary.write.deleteMultiple(rooms);

  const roomStateObjectsId = (
    await Promise.allSettled(
      rooms.map((roomId) => ct.storage.joinRoomState.read.queryIndexKeys('roomId', roomId))
    )
  )
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  await ct.storage.joinRoomState.write.deleteMultiple(roomStateObjectsId);

  const roomMemberObjectsId = (
    await Promise.allSettled(
      rooms.map((roomId) => ct.storage.joinRoomMember.read.queryIndexKeys('roomId', roomId))
    )
  )
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  await ct.storage.joinRoomMember.write.deleteMultiple(roomMemberObjectsId);

  await ct.storage.joinRoomLatestEvent.write.deleteMultiple(rooms);

  const readReceiptObjectsId = (
    await Promise.allSettled(
      rooms.map((roomId) => ct.storage.readReceipt.read.queryIndexKeys('roomId', roomId))
    )
  )
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  await ct.storage.readReceipt.write.deleteMultiple(readReceiptObjectsId);

  await ct.storage.unreadNotifications.write.deleteMultiple(rooms);

  const unreadThreadNotificationsObjectIds = (
    await Promise.allSettled(
      rooms.map((roomId) =>
        ct.storage.unreadThreadNotifications.read.queryIndexKeys('roomId', roomId)
      )
    )
  )
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  await ct.storage.unreadThreadNotifications.write.deleteMultiple(
    unreadThreadNotificationsObjectIds
  );
};

export const getStaleJoinRooms = (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): string[] => {
  const notJoinedRooms = joinRooms.filter((roomId) => {
    const joinRoom = join[roomId];

    const myMemberEvent = joinRoomUtil
      .roomState(joinRoom)
      .find((event) => event.type === 'm.room.member' && event.state_key === ct.session.userId);

    if (!myMemberEvent) return false;

    const membership = ObjectReader.string(myMemberEvent.content, 'membership');

    return membership !== 'join';
  });

  return notJoinedRooms;
};

export const getStaleInviteRooms = (
  ct: ClientContext,
  inviteRooms: string[],
  invite: Record<string, InviteRoom>
): string[] => {
  const notInviteRooms = inviteRooms.filter((roomId) => {
    const joinRoom = invite[roomId];

    const myMemberEvent = inviteRoomUtil
      .roomInviteState(joinRoom)
      .find((event) => event.type === 'm.room.member' && event.state_key === ct.session.userId);

    if (!myMemberEvent) return false;

    const membership = ObjectReader.string(myMemberEvent.content, 'membership');

    return membership !== 'invite';
  });

  return notInviteRooms;
};

export const getStaleKnockRooms = (
  ct: ClientContext,
  knockRooms: string[],
  knock: Record<string, KnockRoom>
): string[] => {
  const notKnockRooms = knockRooms.filter((roomId) => {
    const knockRoom = knock[roomId];

    const myMemberEvent = knockRoomUtil
      .roomKnockState(knockRoom)
      .find((event) => event.type === 'm.room.member' && event.state_key === ct.session.userId);

    if (!myMemberEvent) return false;

    const membership = ObjectReader.string(myMemberEvent.content, 'membership');

    return membership !== 'knock';
  });

  return notKnockRooms;
};

export const getStaleLeaveRooms = (
  ct: ClientContext,
  leaveRooms: string[],
  leave: Record<string, LeaveRoom>
): string[] => {
  const notLeavedRooms = leaveRooms.filter((roomId) => {
    const leaveRoom = leave[roomId];

    const myMemberEvent = leaveRoomUtil
      .roomState(leaveRoom)
      .find((event) => event.type === 'm.room.member' && event.state_key === ct.session.userId);

    if (!myMemberEvent) return false;

    const membership = ObjectReader.string(myMemberEvent.content, 'membership');

    return membership !== 'leave';
  });

  return notLeavedRooms;
};
