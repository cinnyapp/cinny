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
 */

import { ClientEvent, MatrixClient, MatrixEvent, Method, Room } from 'matrix-js-sdk';
import { getSkippedRooms, isSkippedRoom, setSkippedRooms } from './lite-store';

const NOTIFICATIONS_POLL_MS = 5 * 60 * 1000;

const unskip = (roomId: string): void => {
  if (!isSkippedRoom(roomId)) return;
  const skipped = getSkippedRooms();
  setSkippedRooms(skipped.filter((id) => id !== roomId));
};

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
  const handleRoom = (room: Room) => {
    // During the replay of the saved chats every room fires this; skipped rooms
    // are not in the saved copy, so only a genuine wake-up matches.
    if (!isSkippedRoom(room.roomId)) return;
    unskip(room.roomId);
    refillRoomState(mx, room);
  };

  mx.on(ClientEvent.Room, handleRoom);

  let timer: ReturnType<typeof setInterval> | undefined;
  if (serverFilter) {
    const tick = () => {
      pollNotificationsForWokenRooms(mx).then((woken) => {
        if (woken.length > 0) onWoken?.(woken);
      });
    };
    tick();
    timer = setInterval(tick, NOTIFICATIONS_POLL_MS);
  }

  return () => {
    mx.removeListener(ClientEvent.Room, handleRoom);
    if (timer) clearInterval(timer);
  };
};
