import { atom, useSetAtom } from 'jotai';
import { MatrixClient, MatrixEvent, Room, RoomEvent, SyncState } from 'matrix-js-sdk';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Membership } from '../../../types/matrix/room';
import { isMarkedUnreadType, isRoomMarkedUnread } from '../../utils/markedUnread';
import { ChunkedRun, runChunked } from '../../utils/batch';
import { useSyncState } from '../../hooks/useSyncState';

/**
 * The set of rooms the user has explicitly marked unread (MSC2867 /
 * `m.marked_unread`).
 *
 * Deliberately a **separate** atom from `roomToUnreadAtom`:
 *  - a marked room has no notification counts, so it does not belong in a map
 *    of `{total, highlight}` that is aggregated up the space tree;
 *  - the set only changes on a user action (or an account-data `/sync` update),
 *    which is orders of magnitude rarer than timeline/receipt traffic — so it
 *    adds no work to the per-`/sync` hot path that the room-list perf fixes
 *    (batched BULK updates + sliced rescan) exist to keep cheap.
 */
export type MarkedUnreadRooms = Set<string>;

export type MarkedUnreadAction =
  | { type: 'RESET'; roomIds: string[] }
  | { type: 'PUT'; roomId: string }
  | { type: 'DELETE'; roomId: string };

const baseMarkedUnread = atom<MarkedUnreadRooms>(new Set<string>());

export const markedUnreadAtom = atom<MarkedUnreadRooms, [MarkedUnreadAction], undefined>(
  (get) => get(baseMarkedUnread),
  (get, set, action) => {
    const current = get(baseMarkedUnread);

    if (action.type === 'RESET') {
      // Skip the write when nothing changed, so the initial scan on a quiet
      // account does not re-render every room-list subscriber for nothing.
      if (
        current.size === action.roomIds.length &&
        action.roomIds.every((roomId) => current.has(roomId))
      ) {
        return undefined;
      }
      set(baseMarkedUnread, new Set(action.roomIds));
      return undefined;
    }

    if (action.type === 'PUT') {
      if (current.has(action.roomId)) return undefined;
      const next = new Set(current);
      next.add(action.roomId);
      set(baseMarkedUnread, next);
      return undefined;
    }

    if (!current.has(action.roomId)) return undefined;
    const next = new Set(current);
    next.delete(action.roomId);
    set(baseMarkedUnread, next);
    return undefined;
  }
);

/** Rooms scanned per slice when rebuilding the whole marked-unread set. */
const MARKED_UNREAD_SCAN_CHUNK_SIZE = 500;

export const useBindMarkedUnreadAtom = (
  mx: MatrixClient,
  markedUnreadAtm: typeof markedUnreadAtom
) => {
  const setMarkedUnread = useSetAtom(markedUnreadAtm);
  const setMarkedUnreadRef = useRef(setMarkedUnread);
  setMarkedUnreadRef.current = setMarkedUnread;

  const scanner = useMemo(() => {
    let scan: ChunkedRun | undefined;
    let rescanQueued = false;

    const run = () => {
      if (scan) {
        // Let the running scan finish and run once more after it instead of
        // restarting it, so a burst of requests cannot starve the scan.
        rescanQueued = true;
        return;
      }
      const roomIds: string[] = [];
      scan = runChunked(
        mx.getRooms(),
        MARKED_UNREAD_SCAN_CHUNK_SIZE,
        (room) => {
          if (isRoomMarkedUnread(room)) roomIds.push(room.roomId);
        },
        () => {
          scan = undefined;
          setMarkedUnreadRef.current({ type: 'RESET', roomIds });
          if (rescanQueued) {
            rescanQueued = false;
            run();
          }
        }
      );
    };

    return {
      scanAll: run,
      dispose: () => {
        scan?.cancel();
        scan = undefined;
        rescanQueued = false;
      },
    };
  }, [mx]);

  useEffect(() => () => scanner.dispose(), [scanner]);

  useEffect(() => {
    scanner.scanAll();
  }, [scanner]);

  // Account data for rooms is only delivered in full on the initial sync, so
  // rescan when a fresh sync cycle starts (same trigger the unread atom uses).
  useSyncState(
    mx,
    useCallback(
      (state, prevState) => {
        if (
          (state === SyncState.Prepared && prevState === null) ||
          (state === SyncState.Syncing && prevState !== SyncState.Syncing)
        ) {
          scanner.scanAll();
        }
      },
      [scanner]
    )
  );

  // matrix-js-sdk re-emits `RoomEvent.AccountData` on the client (see
  // `sync.js` -> `reEmitter.reEmit(room, [... RoomEvent.AccountData ...])`), so
  // a single listener covers every room — the pattern `roomToUnread` already
  // uses for `RoomEvent.Receipt`.
  useEffect(() => {
    const handleAccountData = (mEvent: MatrixEvent, room: Room) => {
      if (!isMarkedUnreadType(mEvent.getType())) return;
      setMarkedUnreadRef.current(
        isRoomMarkedUnread(room)
          ? { type: 'PUT', roomId: room.roomId }
          : { type: 'DELETE', roomId: room.roomId }
      );
    };
    mx.on(RoomEvent.AccountData, handleAccountData);
    return () => {
      mx.removeListener(RoomEvent.AccountData, handleAccountData);
    };
  }, [mx]);

  useEffect(() => {
    const handleMembershipChange = (room: Room, membership: string) => {
      if (membership !== Membership.Join) {
        setMarkedUnreadRef.current({ type: 'DELETE', roomId: room.roomId });
      }
    };
    mx.on(RoomEvent.MyMembership, handleMembershipChange);
    return () => {
      mx.removeListener(RoomEvent.MyMembership, handleMembershipChange);
    };
  }, [mx]);
};
