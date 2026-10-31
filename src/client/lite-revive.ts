/**
 * Lite mode, part 3: bringing a skipped chat back when it wakes up.
 *
 * Two cases:
 *
 * 1. **Default (no server filter).** The homeserver still sends the room down
 *    /sync when something happens in it, so matrix-js-sdk creates a `Room` for
 *    it by itself. But an *incremental* sync only carries state *changes*, and
 *    we deleted the room's stored state — so the room would show up without a
 *    name, avatar or members. We therefore refetch its current state once
 *    (`GET /rooms/{id}/state`) and drop it from the skipped list so the next
 *    load keeps it.
 *
 * 2. **Server filter on (opt-in).** `room.not_rooms` means /sync never mentions
 *    the room at all, so nothing above can fire. Push rules are server-side and
 *    unaffected, so `GET /notifications` still reports activity in excluded
 *    rooms; we poll it and un-exclude anything that shows up.
 *
 * A chat that arrives BEFORE the first PREPARED is never a wake-up: that is
 * either the replay of the saved copy (skipped chats are not in it) or the
 * one-time initial /sync, which brings every chat with its full state — after
 * "Clear Cache" every skipped chat arrived there and each one was refetched
 * (7,219 `GET /rooms/{id}/state` in one load, 2026-10-21).
 */

import { ClientEvent, MatrixClient, MatrixEvent, Method, Room, SyncState } from 'matrix-js-sdk';
import { getSkippedRooms, isSkippedRoom, setSkippedRooms } from './lite-store';
import {
  addToLiteIndex,
  isIndexFilled,
  markIndexFilled,
  planIndexFill,
  readLiteIndex,
  rowsFromNameSnapshot,
} from './lite-index';
import { isReviving, requestNameIndexSnapshot } from './lite-room-load';

const NOTIFICATIONS_POLL_MS = 5 * 60 * 1000;
/** at most this many `GET /rooms/{id}/state` in flight: a burst of wake-ups queues */
export const MAX_STATE_FETCHES = 4;

const refillRoomState = async (mx: MatrixClient, room: Room): Promise<void> => {
  try {
    const stateEvents = await mx.roomState(room.roomId);
    room.currentState.setStateEvents(stateEvents.map((event) => new MatrixEvent(event)));
    room.recalculate();
    mx.emit(ClientEvent.Room, room);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('lite mode: could not reload state for a chat that woke up', room.roomId, err);
  }
};

type NotificationsResponse = {
  notifications?: Array<{ room_id?: string }>;
};

const pollNotificationsForWokenRooms = async (mx: MatrixClient): Promise<string[]> => {
  const skipped = new Set(getSkippedRooms());
  if (skipped.size === 0) return [];
  try {
    const res = await mx.http.authedRequest<NotificationsResponse>(Method.Get, '/notifications', {
      limit: 100,
    });
    const woken = new Set<string>();
    (res.notifications ?? []).forEach((notification) => {
      const roomId = notification.room_id;
      if (roomId && skipped.has(roomId)) woken.add(roomId);
    });
    if (woken.size > 0) {
      setSkippedRooms(getSkippedRooms().filter((id) => !woken.has(id)));
    }
    return [...woken];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('lite mode: could not check for activity in skipped chats', err);
    return [];
  }
};

/* ------------------------------------------------------------------------- */
/* Filling the name index for chats skipped before the index existed          */
/* ------------------------------------------------------------------------- */

const BACKFILL_START_DELAY_MS = 30_000;
const BACKFILL_RETRY_MS = 5 * 60 * 1000;
const BACKFILL_MAX_ATTEMPTS = 3;

/**
 * Chats skipped on an earlier load were dropped without a note of their name.
 * Learn them once, in the background, with ONE plain read of the homeserver that
 * carries only names, pictures and the newest message (see
 * `requestNameIndexSnapshot`). Starts well after the app has settled, never runs
 * twice (a later load that finds the index complete does nothing), retries a
 * failure a couple of times, and stops when the app closes.
 */
export const startLiteIndexBackfill = (mx: MatrixClient): (() => void) => {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // cancelled by the teardown: a stopped backfill leaves no timer behind
  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    });
  const run = async () => {
    await sleep(BACKFILL_START_DELAY_MS);
    for (let attempt = 1; attempt <= BACKFILL_MAX_ATTEMPTS; attempt += 1) {
      if (stopped) return;
      const plan = planIndexFill(getSkippedRooms(), readLiteIndex(), isIndexFilled());
      if (!plan.run) return;
      try {
        // eslint-disable-next-line no-await-in-loop
        const data = await requestNameIndexSnapshot(mx);
        if (stopped) return;
        addToLiteIndex(rowsFromNameSnapshot(plan.ids, data.rooms?.join ?? {}));
        markIndexFilled();
        return;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('lite mode: could not learn the names of the skipped chats', err);
        // eslint-disable-next-line no-await-in-loop
        await sleep(BACKFILL_RETRY_MS);
      }
    }
  };
  run();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
};

/**
 * Install both reactivation paths. Returns a teardown function.
 *
 * `onWoken` is called with the room IDs that woke up while the server filter is
 * on — the app cannot show them until the filter is refreshed, so the caller
 * surfaces a "an old chat has new messages — reload to see it" hint.
 */
export const watchSkippedRooms = (
  mx: MatrixClient,
  serverFilter: boolean,
  onWoken?: (roomIds: string[]) => void
): (() => void) => {
  // Wake-ups count only after the first PREPARED (see the top of this file).
  const syncState = mx.getSyncState();
  let live = syncState === SyncState.Prepared || syncState === SyncState.Syncing;
  const handleSync = (state: SyncState) => {
    if (state !== SyncState.Prepared && state !== SyncState.Syncing) return;
    live = true;
    mx.removeListener(ClientEvent.Sync, handleSync);
  };
  if (!live) mx.on(ClientEvent.Sync, handleSync);

  // Woken chats leave the skipped list in one write per burst (rewriting the
  // whole list per chat was quadratic), and their state is refetched a few at
  // a time.
  const woken = new Set<string>();
  let flushQueued = false;
  const flushWoken = () => {
    flushQueued = false;
    if (woken.size === 0) return;
    setSkippedRooms(getSkippedRooms().filter((id) => !woken.has(id)));
    woken.clear();
  };
  const queue: Room[] = [];
  let inFlight = 0;
  let stopped = false;
  let pump: () => void = () => undefined;
  const refillDone = () => {
    inFlight -= 1;
    pump();
  };
  pump = () => {
    while (!stopped && inFlight < MAX_STATE_FETCHES && queue.length > 0) {
      const room = queue.shift() as Room;
      inFlight += 1;
      refillRoomState(mx, room).finally(refillDone);
    }
  };

  const handleRoom = (room: Room) => {
    if (!live) return;
    // During stage 2 of the replay every saved room fires this; skipped rooms
    // are not in the saved copy, so only a genuine wake-up matches.
    const { roomId } = room;
    if (woken.has(roomId) || !isSkippedRoom(roomId) || isReviving(roomId)) return;
    woken.add(roomId);
    if (!flushQueued) {
      flushQueued = true;
      queueMicrotask(flushWoken);
    }
    queue.push(room);
    pump();
  };

  mx.on(ClientEvent.Room, handleRoom);
  const stopBackfill = startLiteIndexBackfill(mx);

  let timer: ReturnType<typeof setInterval> | undefined;
  if (serverFilter) {
    const tick = () => {
      pollNotificationsForWokenRooms(mx).then((ids) => {
        if (ids.length > 0) onWoken?.(ids);
      });
    };
    tick();
    timer = setInterval(tick, NOTIFICATIONS_POLL_MS);
  }

  return () => {
    stopped = true;
    mx.removeListener(ClientEvent.Room, handleRoom);
    mx.removeListener(ClientEvent.Sync, handleSync);
    stopBackfill();
    if (timer) clearInterval(timer);
  };
};
