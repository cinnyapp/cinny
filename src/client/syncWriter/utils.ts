import { InviteRoom, JoinRoom, KnockRoom, LeaveRoom } from 'neurone/lib/api/matrix/client/v3/sync';
import {
  AccountDataEvent,
  MessageEventWithoutRoomId,
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
import { QueryRange } from 'neurone/lib/storage/collection';
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
  JoinRoomStickyObject,
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
import { getLatestEventSyncFilter } from '../filter';

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

export const writeJoinRoomSticky = async (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): Promise<void> => {
  const expiredEventKeys = await ct.storage.joinRoomSticky.read.queryIndexKeys(
    'expiresAt',
    new QueryRange(0, Date.now())
  );
  if (expiredEventKeys.length > 0) {
    await ct.storage.joinRoomSticky.write.deleteMultiple(expiredEventKeys);
  }

  const stickyEventObjects: JoinRoomStickyObject[] = joinRooms.flatMap((roomId) => {
    const joinRoom = join[roomId];

    const stickyEvents = Array.from(
      (ObjectReader.array(ObjectReader.object(joinRoom, 'msc4354_sticky'), 'events') as
        | MessageEventWithoutRoomId[]
        | undefined) ?? []
    );

    stickyEvents.push(
      ...joinRoomUtil.roomTimeline(joinRoom).filter((event) => {
        const remainingMs = ObjectReader.number(event.unsigned, 'msc4354_sticky_duration_ttl_ms');
        return remainingMs && remainingMs > 0;
      })
    );

    const stickyObjects: JoinRoomStickyObject[] = [];

    stickyEvents.forEach((event) => {
      const remainingMs = ObjectReader.number(event.unsigned, 'msc4354_sticky_duration_ttl_ms');
      if (!remainingMs || remainingMs <= 0) return;

      const obj: JoinRoomStickyObject = {
        id: event.event_id,
        roomId,
        type: event.type,
        expiresAt: Date.now() + remainingMs,
        event,
      };

      stickyObjects.push(obj);
    });

    return stickyObjects;
  });

  await ct.storage.joinRoomSticky.write.putMultiple(stickyEventObjects);
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

  const latestEventFilter = getLatestEventSyncFilter();
  const supportedTypes = latestEventFilter.room?.timeline?.types ?? [];

  joinRooms.forEach((roomId) => {
    const joinRoom = join[roomId];
    const { events } = joinRoom.timeline ?? {};
    if (!events) return;

    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i];
      if (supportedTypes.includes(event.type)) {
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

    type LatestReceipt = {
      eventId: string;
      userId: string;
      receiptType: ReceiptType;
      receipt: Receipt;
    };

    // One latest receipt per user + thread.
    const latestReceipts = new Map<string, LatestReceipt>();

    const collectLatestReceipt = (
      eventId: string,
      userId: string,
      receiptType: ReceiptType,
      receipt: Receipt
    ) => {
      const threadId = receipt.thread_id ?? ThreadId.Main;
      const key = `${userId}:${threadId}`;
      const existing = latestReceipts.get(key);

      const receiptTs = receipt.ts ?? 0;
      const existingTs = existing?.receipt.ts ?? 0;

      if (!existing || receiptTs > existingTs) {
        latestReceipts.set(key, {
          eventId,
          userId,
          receiptType,
          receipt,
        });
      }
    };

    Object.keys(event.content).forEach((eventId) => {
      const receiptContent = event.content[eventId];

      // Collect public receipts.
      const userToPublic = receiptContent['m.read'];

      if (userToPublic) {
        Object.keys(userToPublic).forEach((userId) => {
          collectLatestReceipt(eventId, userId, 'm.read', userToPublic[userId]);
        });
      }

      // Collect private receipts.
      const userToPrivate = receiptContent['m.read.private'];

      if (userToPrivate) {
        Object.keys(userToPrivate).forEach((userId) => {
          collectLatestReceipt(eventId, userId, 'm.read.private', userToPrivate[userId]);
        });
      }
    });

    return Array.from(latestReceipts.values()).map(({ eventId, userId, receiptType, receipt }) => {
      const threadId = receipt.thread_id ?? ThreadId.Main;

      return {
        id: getReadReceiptId(roomId, userId, threadId),
        roomId,
        userId,
        type: receiptType,
        eventId,
        ts: receipt.ts ?? 0,
        threadId,
      };
    });
  });

  await ct.storage.readReceipt.write.putMultiple(readReceiptObjects);
};

export const writeUnreadNotifications = async (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): Promise<void> => {
  const existing = await ct.storage.unreadNotifications.read.getMultiple(joinRooms);

  const unreadNotificationsObjects: UnreadNotificationsObject[] = [];
  const roomsToDelete: string[] = [];

  joinRooms.forEach((roomId, index) => {
    const joinRoom = join[roomId];
    const existingUnread = existing[index]?.unread;
    const unread = joinRoomUtil.roomUnreadNotifications(joinRoom);

    if (!unread) {
      if (existingUnread) {
        roomsToDelete.push(roomId);
      }
      return;
    }

    if (
      existingUnread?.highlight_count === unread.highlight_count &&
      existingUnread?.notification_count === unread.notification_count
    ) {
      return;
    }

    unreadNotificationsObjects.push({
      id: roomId,
      unread,
    });
  });

  if (roomsToDelete.length > 0) {
    await ct.storage.unreadNotifications.write.deleteMultiple(roomsToDelete);
  }

  if (unreadNotificationsObjects.length > 0) {
    await ct.storage.unreadNotifications.write.putMultiple(unreadNotificationsObjects);
  }
};

export const writeUnreadThreadNotifications = async (
  ct: ClientContext,
  joinRooms: string[],
  join: Record<string, JoinRoom>
): Promise<void> => {
  const notificationsToRemove: UnreadThreadNotificationsObject[] = [];

  const unreadThreadNotificationsObjects: UnreadThreadNotificationsObject[] = joinRooms.flatMap(
    (roomId) => {
      const joinRoom = join[roomId];

      const unreadThreadNotifications = joinRoomUtil.roomUnreadThreadNotifications(joinRoom) ?? {};

      const threadIds = Object.keys(unreadThreadNotifications);

      const toRemove = ct.threadNotifications.read.filter(
        (n) => n.roomId === roomId && !threadIds.includes(n.threadId)
      );
      notificationsToRemove.push(...toRemove);

      return threadIds.map((threadId) => {
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

  const toRemoveKeys = notificationsToRemove.map((n) =>
    getUnreadThreadNotificationId(n.roomId, n.threadId)
  );
  if (toRemoveKeys.length > 0) {
    await ct.storage.unreadThreadNotifications.write.deleteMultiple(toRemoveKeys);
  }
  if (unreadThreadNotificationsObjects.length > 0) {
    await ct.storage.unreadThreadNotifications.write.putMultiple(unreadThreadNotificationsObjects);
  }
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
