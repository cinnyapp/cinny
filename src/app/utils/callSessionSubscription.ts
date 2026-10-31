/**
 * One shared listener per MatrixRTC session manager, fanned out by room.
 *
 * Every room-list row (and the call view, call status, ...) wants to know when
 * a call starts or ends in *its* room. Registering `session_started` /
 * `session_ended` on the client's session manager once per row meant N
 * listeners for N visible rooms: Node's EventEmitter warns at 11
 * ("MaxListenersExceededWarning: Possible EventEmitter memory leak detected")
 * - the room list easily shows more than ten rows - and every call event ran
 * N handlers just to have N-1 of them ignore it. Here the manager gets exactly
 * one handler per event while anyone is subscribed, and none once nobody is.
 *
 * Kept free of SDK imports (the emitter and event names are passed in) so it
 * can be unit-tested with plain node.
 */

export type SessionEventEmitter = {
  on(event: string, listener: (roomId: string, ...rest: unknown[]) => void): unknown;
  off(event: string, listener: (roomId: string, ...rest: unknown[]) => void): unknown;
};

type Entry = {
  rooms: Map<string, Set<() => void>>;
  dispatch: (roomId: string) => void;
  events: readonly string[];
};

const entries = new WeakMap<SessionEventEmitter, Entry>();

export const subscribeRoomCallSession = (
  manager: SessionEventEmitter,
  events: readonly string[],
  roomId: string,
  listener: () => void
): (() => void) => {
  let entry = entries.get(manager);
  if (!entry) {
    const rooms = new Map<string, Set<() => void>>();
    const dispatch = (changedRoomId: string) => {
      const listeners = rooms.get(changedRoomId);
      if (!listeners) return;
      // Copy: a listener may unsubscribe (unmount) while we iterate.
      [...listeners].forEach((cb) => cb());
    };
    entry = { rooms, dispatch, events };
    events.forEach((ev) => manager.on(ev, dispatch));
    entries.set(manager, entry);
  }

  const { rooms } = entry;
  let listeners = rooms.get(roomId);
  if (!listeners) {
    listeners = new Set();
    rooms.set(roomId, listeners);
  }
  listeners.add(listener);

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    const current = entries.get(manager);
    if (!current) return;
    const set = current.rooms.get(roomId);
    set?.delete(listener);
    if (set && set.size === 0) current.rooms.delete(roomId);
    if (current.rooms.size === 0) {
      current.events.forEach((ev) => manager.off(ev, current.dispatch));
      entries.delete(manager);
    }
  };
};
