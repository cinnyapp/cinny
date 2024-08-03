import produce from 'immer';
import { atom, useSetAtom, PrimitiveAtom, useAtomValue } from 'jotai';
import {
  IRoomTimelineData,
  MatrixClient,
  MatrixEvent,
  Room,
  RoomEvent,
  SyncState,
} from 'matrix-js-sdk';
import { ReceiptContent, ReceiptType } from 'matrix-js-sdk/lib/@types/read_receipts';
import { useCallback, useEffect } from 'react';
import {
  MuteChanges,
  Membership,
  NotificationType,
  RoomToUnread,
  UnreadInfo,
  Unread,
  StateEvent,
} from '../../../types/matrix/room';
import {
  getAllParents,
  getNotificationType,
  getUnreadInfo,
  getUnreadInfos,
  isNotificationEvent,
  roomHaveUnread,
} from '../../utils/room';
import { roomToParentsAtom } from './roomToParents';
import { useStateEventCallback } from '../../hooks/useStateEventCallback';
import { useSyncState } from '../../hooks/useSyncState';

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

export const unreadInfoToUnread = (unreadInfo: UnreadInfo): Unread => ({
  highlight: unreadInfo.highlight,
  total: unreadInfo.total,
  from: null,
});

const putUnreadInfo = (
  roomToUnread: RoomToUnread,
  allParents: Set<string>,
  unreadInfo: UnreadInfo
) => {
  const oldUnread = roomToUnread.get(unreadInfo.roomId) ?? { highlight: 0, total: 0, from: null };
  roomToUnread.set(unreadInfo.roomId, unreadInfoToUnread(unreadInfo));

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

export const unreadEqual = (u1: Unread, u2: Unread): boolean => {
  const countEqual = u1.highlight === u2.highlight && u1.total === u2.total;

  if (!countEqual) return false;

  const f1 = u1.from;
  const f2 = u2.from;
  if (f1 === null && f2 === null) return true;
  if (f1 === null || f2 === null) return false;

  if (f1.size !== f2.size) return false;

  let fromEqual = true;
  f1?.forEach((item) => {
    if (!f2?.has(item)) {
      fromEqual = false;
    }
  });

  return fromEqual;
};

const baseRoomToUnread = atom<RoomToUnread>(new Map());
export const roomToUnreadAtom = atom<RoomToUnread, [RoomToUnreadAction], undefined>(
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
      const { unreadInfo } = action;
      const currentUnread = get(baseRoomToUnread).get(unreadInfo.roomId);
      if (currentUnread && unreadEqual(currentUnread, unreadInfoToUnread(unreadInfo))) {
        // Do not update if unread data has not changes
        // like total & highlight
        return;
      }
      set(
        baseRoomToUnread,
        produce(get(baseRoomToUnread), (draftRoomToUnread) =>
          putUnreadInfo(
            draftRoomToUnread,
            getAllParents(get(roomToParentsAtom), unreadInfo.roomId),
            unreadInfo
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
  unreadAtom: typeof roomToUnreadAtom,
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

  useSyncState(
    mx,
    useCallback(
      (state, prevState) => {
        if (
          (state === SyncState.Prepared && prevState === null) ||
          (state === SyncState.Syncing && prevState !== SyncState.Syncing)
        ) {
          setUnreadAtom({
            type: 'RESET',
            unreadInfos: getUnreadInfos(mx),
          });
        }
      },
      [mx, setUnreadAtom]
    )
  );

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

  useStateEventCallback(
    mx,
    useCallback(
      (mEvent) => {
        if (mEvent.getType() === StateEvent.SpaceChild) {
          setUnreadAtom({
            type: 'RESET',
            unreadInfos: getUnreadInfos(mx),
          });
        }
      },
      [mx, setUnreadAtom]
    )
  );
};
