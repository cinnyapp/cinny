import produce from 'immer';
import { atom, useSetAtom, PrimitiveAtom, WritableAtom, useAtomValue } from 'jotai';
import { IRoomTimelineData, MatrixClient, MatrixEvent, Room, RoomEvent } from 'matrix-js-sdk';
import { ReceiptContent, ReceiptType } from 'matrix-js-sdk/lib/@types/read_receipts';
import { useEffect } from 'react';
import {
  MuteChanges,
  Membership,
  NotificationType,
  RoomToUnread,
  UnreadInfo,
} from '../../types/matrix/room';
import {
  getAllParents,
  getNotificationType,
  getUnreadInfo,
  getUnreadInfos,
  isNotificationEvent,
  roomHaveUnread,
} from '../utils/room';
import { roomToParentsAtom } from './roomToParents';

export type RoomToUnreadAction =
  | {
      type: 'RESET';
      unreadInfos: UnreadInfo[];
    }
  | {
      type: 'PUT';
      unreadInfo: UnreadInfo;
    }
  | {
      type: 'DELETE';
      roomId: string;
    };

const putUnreadInfo = (
  roomToUnread: RoomToUnread,
  allParents: Set<string>,
  unreadInfo: UnreadInfo
) => {
  const oldUnread = roomToUnread.get(unreadInfo.roomId) ?? { highlight: 0, total: 0, from: null };
  roomToUnread.set(unreadInfo.roomId, {
    highlight: unreadInfo.highlight,
    total: unreadInfo.total,
    from: null,
  });

  const newH = unreadInfo.highlight - oldUnread.highlight;
  const newT = unreadInfo.total - oldUnread.total;

  allParents.forEach((parentId) => {
    const oldParentUnread = roomToUnread.get(parentId) ?? { highlight: 0, total: 0, from: null };
    roomToUnread.set(parentId, {
      highlight: (oldParentUnread.highlight += newH),
      total: (oldParentUnread.total += newT),
      from: new Set([...(oldParentUnread.from ?? []), unreadInfo.roomId]),
    });
  });
};

const deleteUnreadInfo = (roomToUnread: RoomToUnread, allParents: Set<string>, roomId: string) => {
  const oldUnread = roomToUnread.get(roomId);
  if (!oldUnread) return;
  roomToUnread.delete(roomId);

  allParents.forEach((parentId) => {
    const oldParentUnread = roomToUnread.get(parentId);
    if (!oldParentUnread) return;
    const newFrom = new Set([...(oldParentUnread.from ?? roomId)]);
    newFrom.delete(roomId);
    if (newFrom.size === 0) {
      roomToUnread.delete(parentId);
      return;
    }
    roomToUnread.set(parentId, {
      highlight: oldParentUnread.highlight - oldUnread.highlight,
      total: oldParentUnread.total - oldUnread.total,
      from: newFrom,
    });
  });
};

const baseRoomToUnread = atom<RoomToUnread>(new Map());
export const roomToUnreadAtom = atom<RoomToUnread, RoomToUnreadAction>(
  (get) => get(baseRoomToUnread),
  (get, set, action) => {
    if (action.type === 'RESET') {
      const draftRoomToUnread: RoomToUnread = new Map();
      action.unreadInfos.forEach((unreadInfo) => {
        putUnreadInfo(
          draftRoomToUnread,
          getAllParents(get(roomToParentsAtom), unreadInfo.roomId),
          unreadInfo
        );
      });
      set(baseRoomToUnread, draftRoomToUnread);
      return;
    }
    if (action.type === 'PUT') {
      set(
        baseRoomToUnread,
        produce(get(baseRoomToUnread), (draftRoomToUnread) =>
          putUnreadInfo(
            draftRoomToUnread,
            getAllParents(get(roomToParentsAtom), action.unreadInfo.roomId),
            action.unreadInfo
          )
        )
      );
      return;
    }
    if (action.type === 'DELETE' && get(baseRoomToUnread).has(action.roomId)) {
      set(
        baseRoomToUnread,
        produce(get(baseRoomToUnread), (draftRoomToUnread) =>
          deleteUnreadInfo(
            draftRoomToUnread,
            getAllParents(get(roomToParentsAtom), action.roomId),
            action.roomId
          )
        )
      );
    }
  }
);

export const useBindRoomToUnreadAtom = (
  mx: MatrixClient,
  unreadAtom: WritableAtom<RoomToUnread, RoomToUnreadAction>,
  muteChangesAtom: PrimitiveAtom<MuteChanges>
) => {
  const setUnreadAtom = useSetAtom(unreadAtom);
  const muteChanges = useAtomValue(muteChangesAtom);

  useEffect(() => {
    setUnreadAtom({
      type: 'RESET',
      unreadInfos: getUnreadInfos(mx),
    });
  }, [mx, setUnreadAtom]);

  useEffect(() => {
    const handleTimelineEvent = (
      mEvent: MatrixEvent,
      room: Room | undefined,
      toStartOfTimeline: boolean | undefined,
      removed: boolean,
      data: IRoomTimelineData
    ) => {
      if (!room || !data.liveEvent || room.isSpaceRoom() || !isNotificationEvent(mEvent)) return;
      if (getNotificationType(mx, room.roomId) === NotificationType.Mute) {
        setUnreadAtom({
          type: 'DELETE',
          roomId: room.roomId,
        });
        return;
      }

      if (mEvent.getSender() === mx.getUserId()) return;
      setUnreadAtom({ type: 'PUT', unreadInfo: getUnreadInfo(room) });
    };
    mx.on(RoomEvent.Timeline, handleTimelineEvent);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [mx, setUnreadAtom]);

  useEffect(() => {
    const handleReceipt = (mEvent: MatrixEvent, room: Room) => {
      if (mEvent.getType() === 'm.receipt') {
        const myUserId = mx.getUserId();
        if (!myUserId) return;
        if (room.isSpaceRoom()) return;
        const content = mEvent.getContent<ReceiptContent>();

        const isMyReceipt = Object.keys(content).find((eventId) =>
          (Object.keys(content[eventId]) as ReceiptType[]).find(
            (receiptType) => content[eventId][receiptType][myUserId]
          )
        );
        if (isMyReceipt) {
          setUnreadAtom({ type: 'DELETE', roomId: room.roomId });
        }
      }
    };
    mx.on(RoomEvent.Receipt, handleReceipt);
    return () => {
      mx.removeListener(RoomEvent.Receipt, handleReceipt);
    };
  }, [mx, setUnreadAtom]);

  useEffect(() => {
    muteChanges.removed.forEach((roomId) => {
      const room = mx.getRoom(roomId);
      if (!room) return;
      if (!roomHaveUnread(mx, room)) return;
      setUnreadAtom({ type: 'PUT', unreadInfo: getUnreadInfo(room) });
    });
    muteChanges.added.forEach((roomId) => {
      setUnreadAtom({ type: 'DELETE', roomId });
    });
  }, [mx, setUnreadAtom, muteChanges]);

  useEffect(() => {
    const handleMembershipChange = (room: Room, membership: string) => {
      if (membership !== Membership.Join) {
        setUnreadAtom({
          type: 'DELETE',
          roomId: room.roomId,
        });
      }
    };
    mx.on(RoomEvent.MyMembership, handleMembershipChange);
    return () => {
      mx.removeListener(RoomEvent.MyMembership, handleMembershipChange);
    };
  }, [mx, setUnreadAtom]);
};
