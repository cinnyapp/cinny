import produce from 'immer';
import { atom, useSetAtom } from 'jotai';
import {
  IRoomTimelineData,
  MatrixClient,
  MatrixEvent,
  Room,
  RoomEvent,
  SyncState,
} from 'matrix-js-sdk';
import { ReceiptContent, ReceiptType } from 'matrix-js-sdk/lib/@types/read_receipts';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
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
  getUnreadInfoIfUnread,
  isNotificationEvent,
} from '../../utils/room';
import { roomToParentsAtom } from './roomToParents';
import { useStateEventCallback } from '../../hooks/useStateEventCallback';
import { useSyncState } from '../../hooks/useSyncState';
import { useRoomsNotificationPreferencesContext } from '../../hooks/useRoomsNotificationPreferences';
import { ChunkedRun, Coalescer, createCoalescer, runChunked } from '../../utils/batch';

/** A single room-scoped change that can be applied as part of a `BULK` action. */
export type RoomToUnreadUpdate =
  | {
      type: 'PUT';
      unreadInfo: UnreadInfo;
    }
  | {
      type: 'DELETE';
      roomId: string;
    };

export type RoomToUnreadAction =
  | {
      type: 'RESET';
      unreadInfos: UnreadInfo[];
    }
  | RoomToUnreadUpdate
  | {
      type: 'BULK';
      updates: RoomToUnreadUpdate[];
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
      return;
    }
    if (action.type === 'BULK') {
      // One `/sync` response can carry events for hundreds of rooms. Applying each
      // one as its own atom write copies the whole map and re-renders every
      // subscriber per room; applying them together does it once.
      const currentRoomToUnread = get(baseRoomToUnread);

      // Keep only the last update per room, then drop the ones that would not
      // change anything, so an all-no-op batch does not trigger a render.
      const lastUpdatePerRoom = new Map<string, RoomToUnreadUpdate>();
      action.updates.forEach((update) => {
        lastUpdatePerRoom.set(
          update.type === 'PUT' ? update.unreadInfo.roomId : update.roomId,
          update
        );
      });
      const updates = Array.from(lastUpdatePerRoom.values()).filter((update) => {
        if (update.type === 'DELETE') return currentRoomToUnread.has(update.roomId);
        const currentUnread = currentRoomToUnread.get(update.unreadInfo.roomId);
        return !(
          currentUnread && unreadEqual(currentUnread, unreadInfoToUnread(update.unreadInfo))
        );
      });
      if (updates.length === 0) return;

      const roomToParents = get(roomToParentsAtom);
      set(
        baseRoomToUnread,
        produce(currentRoomToUnread, (draftRoomToUnread) => {
          updates.forEach((update) => {
            if (update.type === 'PUT') {
              putUnreadInfo(
                draftRoomToUnread,
                getAllParents(roomToParents, update.unreadInfo.roomId),
                update.unreadInfo
              );
              return;
            }
            deleteUnreadInfo(
              draftRoomToUnread,
              getAllParents(roomToParents, update.roomId),
              update.roomId
            );
          });
        })
      );
    }
  }
);

/**
 * Rooms scanned per slice when rebuilding the whole unread map. Keeps each slice
 * in the low-millisecond range even on an account with thousands of rooms, so the
 * rebuild never becomes one long task that freezes the UI.
 */
const UNREAD_SCAN_CHUNK_SIZE = 250;

type UnreadScheduler = {
  /** Queue a single room's change; queued changes are applied together. */
  queue: (update: RoomToUnreadUpdate) => void;
  /** Request a full rebuild of the unread map (coalesced, sliced). */
  scanAll: () => void;
  dispose: () => void;
};

const createUnreadScheduler = (
  mx: MatrixClient,
  setUnreadAtom: (action: RoomToUnreadAction) => void
): UnreadScheduler => {
  const pending = new Map<string, RoomToUnreadUpdate>();
  let scan: ChunkedRun | undefined;
  let rescanQueued = false;

  const flushPending = () => {
    if (pending.size === 0) return;
    const updates = Array.from(pending.values());
    pending.clear();
    setUnreadAtom({ type: 'BULK', updates });
  };
  const flush: Coalescer = createCoalescer(flushPending);

  const runScan = () => {
    if (scan) {
      // A scan is already in progress. Let it finish and run once more after it,
      // rather than restarting it and risking never reaching the end.
      rescanQueued = true;
      return;
    }
    const rooms = mx.getRooms();
    const unreadInfos: UnreadInfo[] = [];
    scan = runChunked(
      rooms,
      UNREAD_SCAN_CHUNK_SIZE,
      (room) => {
        const unreadInfo = getUnreadInfoIfUnread(mx, room);
        if (unreadInfo) unreadInfos.push(unreadInfo);
      },
      () => {
        scan = undefined;
        setUnreadAtom({ type: 'RESET', unreadInfos });
        // Anything that arrived while the scan was running has to win over it.
        flush.cancel();
        flushPending();
        if (rescanQueued) {
          rescanQueued = false;
          runScan();
        }
      }
    );
  };
  const scanRequest: Coalescer = createCoalescer(runScan);

  return {
    queue: (update) => {
      pending.set(update.type === 'PUT' ? update.unreadInfo.roomId : update.roomId, update);
      flush.schedule();
    },
    scanAll: () => {
      scanRequest.schedule();
    },
    dispose: () => {
      flush.cancel();
      scanRequest.cancel();
      scan?.cancel();
      scan = undefined;
      rescanQueued = false;
      pending.clear();
    },
  };
};

export const useBindRoomToUnreadAtom = (mx: MatrixClient, unreadAtom: typeof roomToUnreadAtom) => {
  const setUnreadAtom = useSetAtom(unreadAtom);
  const roomsNotificationPreferences = useRoomsNotificationPreferencesContext();

  const setUnreadAtomRef = useRef(setUnreadAtom);
  setUnreadAtomRef.current = setUnreadAtom;

  const scheduler = useMemo(
    () => createUnreadScheduler(mx, (action) => setUnreadAtomRef.current(action)),
    [mx]
  );
  useEffect(() => () => scheduler.dispose(), [scheduler]);

  useEffect(() => {
    scheduler.scanAll();
  }, [scheduler]);

  useSyncState(
    mx,
    useCallback(
      (state, prevState) => {
        if (
          (state === SyncState.Prepared && prevState === null) ||
          (state === SyncState.Syncing && prevState !== SyncState.Syncing)
        ) {
          scheduler.scanAll();
        }
      },
      [scheduler]
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
        scheduler.queue({
          type: 'DELETE',
          roomId: room.roomId,
        });
        return;
      }

      if (mEvent.getSender() === mx.getUserId()) return;
      scheduler.queue({ type: 'PUT', unreadInfo: getUnreadInfo(room) });
    };
    mx.on(RoomEvent.Timeline, handleTimelineEvent);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [mx, scheduler]);

  useEffect(() => {
    const handleReceipt = (mEvent: MatrixEvent, room: Room) => {
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
        scheduler.queue({ type: 'DELETE', roomId: room.roomId });
      }
    };
    mx.on(RoomEvent.Receipt, handleReceipt);
    return () => {
      mx.removeListener(RoomEvent.Receipt, handleReceipt);
    };
  }, [mx, scheduler]);

  useEffect(() => {
    scheduler.scanAll();
  }, [scheduler, roomsNotificationPreferences]);

  useEffect(() => {
    const handleMembershipChange = (room: Room, membership: string) => {
      if (membership !== Membership.Join) {
        scheduler.queue({
          type: 'DELETE',
          roomId: room.roomId,
        });
      }
    };
    mx.on(RoomEvent.MyMembership, handleMembershipChange);
    return () => {
      mx.removeListener(RoomEvent.MyMembership, handleMembershipChange);
    };
  }, [mx, scheduler]);

  useStateEventCallback(
    mx,
    useCallback(
      (mEvent) => {
        if (mEvent.getType() === StateEvent.SpaceChild) {
          scheduler.scanAll();
        }
      },
      [scheduler]
    )
  );
};
