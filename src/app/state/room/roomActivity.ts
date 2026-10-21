import { atom, useSetAtom } from 'jotai';
import {
  ClientEvent,
  EventStatus,
  MatrixClient,
  MatrixEvent,
  Method,
  Room,
  RoomEvent,
  SyncState,
} from 'matrix-js-sdk';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityEvent,
  MESSAGE_LOOKUP_FILTER,
  RoomActivity,
  classifyActivityEvent,
  computeRoomActivity,
  involvesMe,
  mergeRoomActivity,
  rawEventLike,
} from '../../utils/roomActivity';
import { ChunkedRun, Coalescer, createCoalescer, runChunked } from '../../utils/batch';
import { useSyncState } from '../../hooks/useSyncState';
import { isReplayActive } from '../../../client/staged-replay';

/**
 * Per-room "last real message" (see utils/roomActivity.ts), kept up to date from
 * the timeline the client already has.
 *
 * Built like `roomToUnreadAtom` after the back-lag fix: listener updates are
 * queued and applied in ONE write per macrotask (a `/sync` response touching 300
 * rooms = one render), the full scan runs in slices, and an update that would not
 * change anything is dropped — so profile/name/member noise costs no render at all.
 */
export type RoomActivityMap = Map<string, RoomActivity>;

export type RoomActivityAction =
  | { type: 'RESET'; activity: RoomActivityMap }
  | { type: 'BULK'; updates: [string, RoomActivity][] };

const baseRoomActivity = atom<RoomActivityMap>(new Map());

/** Mirror of the atom for non-React callers (`factoryRoomIdByActivity`). */
let currentActivity: RoomActivityMap = new Map();
export const getRoomActivity = (roomId: string): RoomActivity | undefined =>
  currentActivity.get(roomId);

export const roomActivityAtom = atom<RoomActivityMap, [RoomActivityAction], undefined>(
  (get) => get(baseRoomActivity),
  (get, set, action) => {
    if (action.type === 'RESET') {
      currentActivity = action.activity;
      set(baseRoomActivity, action.activity);
      return;
    }
    const current = get(baseRoomActivity);
    let next: RoomActivityMap | undefined;
    action.updates.forEach(([roomId, update]) => {
      const before = (next ?? current).get(roomId);
      const merged = mergeRoomActivity(before, update);
      if (merged === before) return;
      if (!next) next = new Map(current);
      next.set(roomId, merged);
    });
    if (!next) return;
    currentActivity = next;
    set(baseRoomActivity, next);
  }
);

const SCAN_CHUNK_SIZE = 500;

// ---------------------------------------------------------------------------
// Remembered across reloads, so a chat whose loaded events are all noise still
// knows where its last message was.
// ---------------------------------------------------------------------------
const CACHE_PREFIX = 'cinny_room_activity_v1:';
const SAVE_DELAY_MS = 15_000;

type CacheRow = [ts: number, mine: number, startOnly: 0 | 1];

const loadCache = (userId: string): RoomActivityMap => {
  const map: RoomActivityMap = new Map();
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + userId);
    if (!raw) return map;
    const rows = JSON.parse(raw) as Record<string, CacheRow>;
    Object.entries(rows).forEach(([roomId, row]) => {
      if (!Array.isArray(row) || typeof row[0] !== 'number') return;
      map.set(roomId, {
        ts: row[0],
        mine: typeof row[1] === 'number' ? row[1] : 0,
        known: true,
        startOnly: row[2] === 1 ? true : undefined,
      });
    });
  } catch {
    // A broken cache is only a missed optimisation.
  }
  return map;
};

const saveCache = (userId: string, activity: RoomActivityMap, joined: Set<string>) => {
  const rows: Record<string, CacheRow> = {};
  activity.forEach((a, roomId) => {
    if (!a.known || !joined.has(roomId)) return;
    rows[roomId] = [a.ts, a.mine, a.startOnly ? 1 : 0];
  });
  try {
    localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(rows));
  } catch {
    // Quota exceeded: keep working without the cache.
  }
};

// ---------------------------------------------------------------------------
// Background lookup: for chats whose loaded events contain no message at all,
// ask the homeserver once for the newest message-type event (server-side type
// filter, 1 small GET). Highest "could be recent" first, 2 at a time, capped.
// ---------------------------------------------------------------------------
const LOOKUP_CONCURRENCY = 2;
const LOOKUP_GAP_MS = 150;
const LOOKUP_CAP_PER_SESSION = 400;

type MessagesResponse = { chunk?: Parameters<typeof rawEventLike>[0][]; end?: string };

const isHighlight = (ev: ActivityEvent): boolean =>
  (ev as unknown as MatrixEvent).getPushActions?.()?.tweaks?.highlight === true;

const roomEvents = (room: Room): MatrixEvent[] => room.getLiveTimeline().getEvents();

export type RoomActivityScheduler = {
  queue: (roomId: string, update: RoomActivity) => void;
  scanAll: () => void;
  setLookupEnabled: (enabled: boolean) => void;
  dispose: () => void;
};

export const createRoomActivityScheduler = (
  mx: MatrixClient,
  setAtom: (action: RoomActivityAction) => void
): RoomActivityScheduler => {
  const userId = mx.getUserId() ?? '';
  const cache = loadCache(userId);
  const pending = new Map<string, RoomActivity>();
  let scan: ChunkedRun | undefined;
  let rescanQueued = false;
  let disposed = false;
  let lookupEnabled = true;
  let lookupsDone = 0;
  const lookedUp = new Set<string>();
  let lookupQueue: string[] = [];
  let lookupsRunning = 0;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleSave = () => {
    if (saveTimer !== undefined || !userId) return;
    saveTimer = setTimeout(() => {
      saveTimer = undefined;
      saveCache(userId, currentActivity, new Set(mx.getRooms().map((r) => r.roomId)));
    }, SAVE_DELAY_MS);
  };

  const saveNow = () => {
    if (saveTimer !== undefined) {
      clearTimeout(saveTimer);
      saveTimer = undefined;
    }
    if (userId) saveCache(userId, currentActivity, new Set(mx.getRooms().map((r) => r.roomId)));
  };
  // Leaving / backgrounding the app (phones kill background tabs) saves at once.
  const onHide = () => {
    if (document.visibilityState === 'hidden' && saveTimer !== undefined) saveNow();
  };
  const onPageHide = () => {
    if (saveTimer !== undefined) saveNow();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onPageHide);

  const flushPending = () => {
    if (pending.size === 0) return;
    const updates = Array.from(pending.entries());
    pending.clear();
    setAtom({ type: 'BULK', updates });
    scheduleSave();
  };
  const flush: Coalescer = createCoalescer(flushPending);

  const queue = (roomId: string, update: RoomActivity) => {
    pending.set(roomId, mergeRoomActivity(pending.get(roomId), update));
    flush.schedule();
  };

  const lookupOne = async (roomId: string) => {
    lookedUp.add(roomId);
    lookupsDone += 1;
    try {
      const path = `/rooms/${encodeURIComponent(roomId)}/messages`;
      const res = await mx.http.authedRequest<MessagesResponse>(Method.Get, path, {
        dir: 'b',
        limit: '20',
        filter: JSON.stringify(MESSAGE_LOOKUP_FILTER),
      });
      if (disposed) return;
      const events = (res.chunk ?? []).map(rawEventLike);
      const found = computeRoomActivity(events, userId, Date.now(), isHighlight);
      if (found.known) {
        queue(roomId, found);
      } else if (events.length === 0 && !res.end) {
        // The chat has never had a message: it belongs at the bottom, and there is
        // nothing left to look for.
        queue(roomId, { ts: 0, mine: found.mine, known: true });
      }
    } catch {
      // Offline / forbidden / old server: the chat simply keeps its place.
    }
  };

  const onLookupDone = () => {
    setTimeout(() => {
      lookupsRunning -= 1;
      // eslint-disable-next-line no-use-before-define, @typescript-eslint/no-use-before-define
      pumpLookups();
    }, LOOKUP_GAP_MS);
  };

  const nextLookup = (): string | undefined => {
    while (lookupQueue.length > 0) {
      const roomId = lookupQueue.shift() as string;
      if (!currentActivity.get(roomId)?.known && !lookedUp.has(roomId)) return roomId;
    }
    return undefined;
  };

  function pumpLookups() {
    while (
      lookupEnabled &&
      !disposed &&
      lookupsRunning < LOOKUP_CONCURRENCY &&
      lookupsDone < LOOKUP_CAP_PER_SESSION
    ) {
      const roomId = nextLookup();
      if (!roomId) return;
      lookupsRunning += 1;
      lookupOne(roomId).finally(onLookupDone);
    }
  }

  const startLookups = () => {
    const unknown: [string, number][] = [];
    currentActivity.forEach((a, roomId) => {
      if (!a.known && !lookedUp.has(roomId)) unknown.push([roomId, a.upper ?? 0]);
    });
    // The chats that could have had a message most recently go first.
    unknown.sort((x, y) => y[1] - x[1]);
    lookupQueue = unknown.map(([roomId]) => roomId);
    pumpLookups();
  };

  const runScan = () => {
    if (scan) {
      rescanQueued = true;
      return;
    }
    const rooms = mx.getRooms();
    const next: RoomActivityMap = new Map();
    const now = Date.now();
    scan = runChunked(
      rooms,
      SCAN_CHUNK_SIZE,
      (room) => {
        if (room.isSpaceRoom()) return;
        const computed = computeRoomActivity(roomEvents(room), userId, now, isHighlight);
        // What we knew before (this session or the cache) is never thrown away.
        const known = mergeRoomActivity(
          mergeRoomActivity(cache.get(room.roomId), currentActivity.get(room.roomId) ?? computed),
          computed
        );
        next.set(room.roomId, known);
      },
      () => {
        scan = undefined;
        if (disposed) return;
        // Updates applied while the scan was running are already in the atom.
        currentActivity.forEach((a, roomId) => {
          if (next.has(roomId)) next.set(roomId, mergeRoomActivity(next.get(roomId), a));
        });
        setAtom({ type: 'RESET', activity: next });
        // Anything that arrived while scanning wins over the scan.
        flush.cancel();
        flushPending();
        scheduleSave();
        startLookups();
        if (rescanQueued) {
          rescanQueued = false;
          runScan();
        }
      }
    );
  };
  const scanRequest: Coalescer = createCoalescer(runScan);

  return {
    queue,
    scanAll: () => scanRequest.schedule(),
    setLookupEnabled: (enabled) => {
      lookupEnabled = enabled;
      if (enabled) pumpLookups();
    },
    dispose: () => {
      disposed = true;
      flush.cancel();
      scanRequest.cancel();
      scan?.cancel();
      scan = undefined;
      pending.clear();
      lookupQueue = [];
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      if (saveTimer !== undefined) saveNow();
    },
  };
};

/** One timeline event → an activity update, or undefined when it changes nothing. */
const updateForEvent = (
  ev: MatrixEvent,
  myUserId: string | null,
  tsOverride?: number
): RoomActivity | undefined => {
  const kind = classifyActivityEvent(ev, myUserId);
  if (kind === 'none') return undefined;
  const ts = Math.min(tsOverride ?? ev.getTs(), Date.now());
  if (kind === 'start') return { ts, mine: ts, known: true, startOnly: true };
  return { ts, mine: involvesMe(ev, myUserId, isHighlight) ? ts : 0, known: true };
};

export const useBindRoomActivityAtom = (
  mx: MatrixClient,
  activityAtom: typeof roomActivityAtom,
  serverLookup: boolean
) => {
  const setAtom = useSetAtom(activityAtom);
  const setAtomRef = useRef(setAtom);
  setAtomRef.current = setAtom;

  const scheduler = useMemo(
    () => createRoomActivityScheduler(mx, (action) => setAtomRef.current(action)),
    [mx]
  );
  useEffect(() => () => scheduler.dispose(), [scheduler]);
  useEffect(() => {
    scheduler.setLookupEnabled(serverLookup);
  }, [scheduler, serverLookup]);

  useEffect(() => {
    scheduler.scanAll();
  }, [scheduler]);

  useSyncState(
    mx,
    useCallback(
      (state, prevState) => {
        if (state === SyncState.Prepared && prevState === null) scheduler.scanAll();
      },
      [scheduler]
    )
  );

  useEffect(() => {
    const myUserId = mx.getUserId();
    const handleTimeline = (
      mEvent: MatrixEvent,
      room: Room | undefined,
      toStartOfTimeline: boolean | undefined,
      removed: boolean
    ) => {
      // Live AND paginated events are both fine: only the event's own timestamp
      // counts and the merge never moves a chat back, so old history loading in
      // (scrolling up, bridge backfill) cannot reorder anything.
      // The same event can arrive through several timeline sets; merging is
      // idempotent, so duplicates cost nothing.
      if (!room || removed || room.isSpaceRoom()) return;
      // staged start-up: the full scan at PREPARED (right after the replay) covers these
      if (isReplayActive()) return;
      const update = updateForEvent(mEvent, myUserId);
      if (update) scheduler.queue(room.roomId, update);
    };
    // Your own message moves the chat the moment you press send, not when the
    // server echo comes back.
    const handleLocalEcho = (mEvent: MatrixEvent, room: Room) => {
      if (mEvent.status !== EventStatus.SENDING) return;
      const update = updateForEvent(mEvent, myUserId, Date.now());
      if (update) scheduler.queue(room.roomId, { ...update, mine: update.ts });
    };
    mx.on(RoomEvent.Timeline, handleTimeline);
    mx.on(RoomEvent.LocalEchoUpdated, handleLocalEcho);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimeline);
      mx.removeListener(RoomEvent.LocalEchoUpdated, handleLocalEcho);
    };
  }, [mx, scheduler]);

  // A newly joined room has to be scanned once so it is not "unknown".
  useEffect(() => {
    const myUserId = mx.getUserId();
    const handleRoom = (room: Room) => {
      if (room.isSpaceRoom()) return;
      if (isReplayActive()) return;
      const computed = computeRoomActivity(roomEvents(room), myUserId, Date.now(), isHighlight);
      scheduler.queue(room.roomId, computed);
    };
    mx.on(ClientEvent.Room, handleRoom);
    return () => {
      mx.removeListener(ClientEvent.Room, handleRoom);
    };
  }, [mx, scheduler]);
};
