/**
 * "Lite mode" — do not load chats that have been quiet for a long time.
 *
 * On an account with ~9,000 rooms the slow part of every page load is
 * matrix-js-sdk replaying the persisted /sync blob: `SyncApi.processSyncResponse()`
 * walks every room and injects every stored state + timeline event. The cost is
 * proportional to the number of *events per room* (members, bridge metadata),
 * not to how recently the room was used — so thousands of long-dead bridge
 * portals are paid for on every single load.
 *
 * Lite mode drops those rooms out of the persisted blob *before* the SDK reads
 * it, and (optionally) asks the homeserver to leave them out of /sync too.
 *
 * Everything in this file is pure so it can be unit tested without a browser:
 * see `scripts/test-lite-mode.mjs`.
 */

/** A raw (unsigned, over-the-wire) event as it appears in the persisted blob. */
export type LiteRawEvent = {
  type?: string;
  state_key?: string;
  sender?: string;
  origin_server_ts?: number;
  content?: Record<string, unknown>;
};

export type LiteRoomSyncData = {
  state?: { events?: LiteRawEvent[] };
  'org.matrix.msc4222.state_after'?: { events?: LiteRawEvent[] };
  timeline?: { events?: LiteRawEvent[]; prev_batch?: string | null };
  account_data?: { events?: LiteRawEvent[] };
  ephemeral?: { events?: LiteRawEvent[] };
  unread_notifications?: { notification_count?: number; highlight_count?: number };
  unread_thread_notifications?: Record<
    string,
    { notification_count?: number; highlight_count?: number } | undefined
  >;
  summary?: Record<string, unknown>;
};

export type LiteRoomsSyncData = {
  join?: Record<string, LiteRoomSyncData>;
  invite?: Record<string, unknown>;
  knock?: Record<string, unknown>;
  leave?: Record<string, unknown>;
};

export type LiteChoice = 'auto' | 'on' | 'off';

export type LiteOptions = {
  /**
   * Skip loading quiet chats at all. With `choice: 'auto'` this is only the
   * starting value — the real decision is made once the saved chats are counted
   * (see `resolveAutoLite`).
   */
  enabled: boolean;
  /** What the user picked. `auto` = on for big accounts, off for small ones. */
  choice?: LiteChoice;
  /** A chat is "quiet" when its newest message is older than this many days. */
  windowDays: number;
  /**
   * Also send the skipped rooms to the homeserver as a /sync `room.not_rooms`
   * filter. Faster and smaller, but a new message in a skipped chat will not
   * reach the app until the chat is loaded again — so this is opt-in.
   */
  serverFilter: boolean;
};

export const LITE_WINDOW_DAYS = [30, 90, 180, 365] as const;

export const DEFAULT_LITE_OPTIONS: LiteOptions = {
  enabled: false,
  choice: 'auto',
  windowDays: 90,
  serverFilter: false,
};

/**
 * Automatic lite mode. Measured on his real account (9,000 chats, 2026-10-20):
 * the reload spends most of its time rebuilding chats nobody has written in for
 * months. So above this many saved chats lite mode switches itself on, with a
 * short window; small accounts load everything as before.
 */
export const LITE_AUTO_MIN_ROOMS = 2000;
export const LITE_AUTO_WINDOW_DAYS = 30;

/**
 * Decide, once the saved chats have been counted, whether lite mode applies to
 * this load and with which window. Pure, for the tests.
 */
export const resolveAutoLite = (
  options: LiteOptions,
  savedRooms: number
): { enabled: boolean; windowDays: number; auto: boolean } => {
  const choice = options.choice ?? (options.enabled ? 'on' : 'off');
  if (choice === 'on') return { enabled: true, windowDays: options.windowDays, auto: false };
  if (choice === 'off') return { enabled: false, windowDays: options.windowDays, auto: false };
  return {
    enabled: savedRooms >= LITE_AUTO_MIN_ROOMS,
    windowDays: LITE_AUTO_WINDOW_DAYS,
    auto: true,
  };
};

/** Event types that count as "someone actually said something". */
const MESSAGE_TYPES = ['m.room.message', 'm.room.encrypted', 'm.sticker'];

/**
 * Why a room is kept even though it is quiet. `undefined` means "no reason to
 * keep it, judge it on activity alone".
 */
export type LiteKeepReason =
  | 'unread'
  | 'favourite'
  | 'space'
  | 'low-member' // notes-to-self / one-member rooms
  | 'bot' // bridge management / admin rooms
  | 'tombstone'; // replaced room: cheap and needed to follow the upgrade

const DAY_MS = 24 * 60 * 60 * 1000;

const events = (bucket?: { events?: LiteRawEvent[] }): LiteRawEvent[] => bucket?.events ?? [];

/** Newest `origin_server_ts` of a real message in the stored timeline, or 0. */
export const lastMessageTs = (room: LiteRoomSyncData): number => {
  let ts = 0;
  events(room.timeline).forEach((event) => {
    if (!event.type || !MESSAGE_TYPES.includes(event.type)) return;
    // state events never count, even if they share a type
    if (typeof event.state_key === 'string') return;
    const eventTs = event.origin_server_ts ?? 0;
    if (eventTs > ts) ts = eventTs;
  });
  return ts;
};

/** Newest `origin_server_ts` of any stored timeline event, or 0. */
export const lastAnyTs = (room: LiteRoomSyncData): number => {
  let ts = 0;
  events(room.timeline).forEach((event) => {
    const eventTs = event.origin_server_ts ?? 0;
    if (eventTs > ts) ts = eventTs;
  });
  return ts;
};

const hasUnread = (room: LiteRoomSyncData): boolean => {
  const unread = room.unread_notifications;
  if ((unread?.notification_count ?? 0) > 0) return true;
  if ((unread?.highlight_count ?? 0) > 0) return true;
  const threads = room.unread_thread_notifications ?? {};
  return Object.keys(threads).some((threadId) => {
    const counts = threads[threadId];
    return (counts?.notification_count ?? 0) > 0 || (counts?.highlight_count ?? 0) > 0;
  });
};

const isFavourite = (room: LiteRoomSyncData): boolean =>
  events(room.account_data).some(
    (event) =>
      event.type === 'm.tag' &&
      typeof event.content?.tags === 'object' &&
      event.content?.tags !== null &&
      'm.favourite' in (event.content.tags as Record<string, unknown>)
  );

const stateEvents = (room: LiteRoomSyncData): LiteRawEvent[] => [
  ...events(room.state),
  ...events(room['org.matrix.msc4222.state_after']),
];

const isSpace = (room: LiteRoomSyncData): boolean =>
  stateEvents(room).some(
    (event) => event.type === 'm.room.create' && event.content?.type === 'm.space'
  );

const hasTombstone = (room: LiteRoomSyncData): boolean =>
  stateEvents(room).some((event) => event.type === 'm.room.tombstone');

const BOT_USER = /^@[^:]*(bot|bridge)[^:]*:/i;

/**
 * Bridge management / admin rooms (`@whatsappbot:…`, `@telegrambot:…`). There
 * are only a handful of them and losing them means losing the way to talk to
 * the bridge, so they are always kept.
 */
const isBotRoom = (room: LiteRoomSyncData): boolean => {
  const memberCount = Number(room.summary?.['m.joined_member_count'] ?? 0);
  if (memberCount > 3) return false;
  return stateEvents(room).some(
    (event) =>
      event.type === 'm.room.member' &&
      typeof event.state_key === 'string' &&
      BOT_USER.test(event.state_key)
  );
};

/** One-member rooms are notes-to-self; there are very few and they matter. */
const isLowMember = (room: LiteRoomSyncData): boolean =>
  Number(room.summary?.['m.joined_member_count'] ?? 0) === 1;

export const roomKeepReason = (room: LiteRoomSyncData): LiteKeepReason | undefined => {
  if (hasUnread(room)) return 'unread';
  if (isFavourite(room)) return 'favourite';
  if (isSpace(room)) return 'space';
  if (hasTombstone(room)) return 'tombstone';
  if (isLowMember(room)) return 'low-member';
  if (isBotRoom(room)) return 'bot';
  return undefined;
};

export const countRoomEvents = (room: LiteRoomSyncData): number =>
  stateEvents(room).length + events(room.timeline).length + events(room.account_data).length;

export type LiteClassification = {
  /** Room IDs that will not be loaded. */
  dormant: string[];
  /** Room IDs that stay. */
  kept: string[];
  /** How many rooms were kept for each reason (plus `active`). */
  keptBecause: Record<string, number>;
  /** Stored events belonging to the dormant rooms (what the replay saves). */
  dormantEvents: number;
  /** Stored events belonging to the kept rooms. */
  keptEvents: number;
};

export type ClassifyOptions = {
  windowDays: number;
  /** `Date.now()` by default — injectable for tests. */
  now?: number;
  /** Room IDs that must never be skipped (currently open room, pinned, …). */
  protect?: Iterable<string>;
};

/**
 * Split the stored joined rooms into "load this" and "skip this".
 *
 * A room is skipped when it has no stored message newer than the window AND no
 * reason to be kept. A room that has never had a message at all (826 of his are
 * like this — empty bridge portals) is skipped as soon as its newest event of
 * any kind is older than the window.
 */
export const classifyRooms = (
  rooms: LiteRoomsSyncData,
  options: ClassifyOptions
): LiteClassification => {
  const now = options.now ?? Date.now();
  const cutoff = now - options.windowDays * DAY_MS;
  const protect = new Set(options.protect ?? []);

  const dormant: string[] = [];
  const kept: string[] = [];
  const keptBecause: Record<string, number> = {};
  let dormantEvents = 0;
  let keptEvents = 0;

  const join = rooms.join ?? {};
  Object.keys(join).forEach((roomId) => {
    const room = join[roomId];
    const count = countRoomEvents(room);

    const keep = (why: string) => {
      kept.push(roomId);
      keptBecause[why] = (keptBecause[why] ?? 0) + 1;
      keptEvents += count;
    };

    if (protect.has(roomId)) {
      keep('protected');
      return;
    }
    const reason = roomKeepReason(room);
    if (reason) {
      keep(reason);
      return;
    }
    // Judge on activity. Prefer real messages; fall back to "any event" so a
    // portal that never carried a message is still measurable.
    const messageTs = lastMessageTs(room);
    const activityTs = messageTs || lastAnyTs(room);
    if (activityTs >= cutoff) {
      keep('active');
      return;
    }
    dormant.push(roomId);
    dormantEvents += count;
  });

  return { dormant, kept, keptBecause, dormantEvents, keptEvents };
};

/**
 * Return a copy of the persisted rooms blob without the given rooms.
 *
 * `invite` / `knock` / `leave` are left alone: invites are few and must always
 * be visible, and `not_rooms` in a /sync filter only applies to joined rooms.
 */
export const pruneRoomsData = (
  rooms: LiteRoomsSyncData,
  skip: Set<string> | string[]
): LiteRoomsSyncData => {
  const skipSet = skip instanceof Set ? skip : new Set(skip);
  const join = rooms.join ?? {};
  const nextJoin: Record<string, LiteRoomSyncData> = {};
  Object.keys(join).forEach((roomId) => {
    if (skipSet.has(roomId)) return;
    nextJoin[roomId] = join[roomId];
  });
  return { ...rooms, join: nextJoin };
};

/**
 * The /sync filter definition for lite mode.
 *
 * `room.not_rooms` is honoured by Synapse for joined rooms, so excluded rooms
 * bring back neither timeline nor state — which also stops a bridge
 * state-resync from dragging 5,000 dead portals back into the store.
 *
 * matrix-js-sdk uploads this once (`POST /_matrix/client/v3/user/{id}/filter`)
 * and then references it by id, so the big list never travels in a URL.
 */
export const buildLiteFilterDefinition = (
  excluded: string[]
): {
  room: {
    not_rooms: string[];
    state: { lazy_load_members: boolean };
  };
} => ({
  room: {
    not_rooms: [...excluded],
    state: { lazy_load_members: true },
  },
});

/**
 * matrix-js-sdk inlines the filter in the /sync query string for the very first
 * sync of an empty store, which a list of thousands of room IDs would blow up
 * (URI too long). Above this many rooms we only use the uploaded-filter path,
 * i.e. only once a sync token already exists.
 */
export const LITE_FILTER_INLINE_SAFE_ROOMS = 40;

const CHOICES: LiteChoice[] = ['auto', 'on', 'off'];

/**
 * `liteMode: true` from before the automatic mode existed still means "on".
 * `liteMode: false` was the old default and is saved in everyone's settings, so
 * it cannot mean "the user switched it off" — it maps to `auto`.
 */
export const liteChoiceFromSettings = (choice: unknown, legacyEnabled: unknown): LiteChoice => {
  if (CHOICES.includes(choice as LiteChoice) && choice !== 'auto') return choice as LiteChoice;
  if (legacyEnabled === true) return 'on';
  return 'auto';
};

export const normalizeLiteOptions = (raw: Partial<LiteOptions> | undefined): LiteOptions => {
  const windowDays = Number(raw?.windowDays);
  const choice = CHOICES.includes(raw?.choice as LiteChoice)
    ? (raw?.choice as LiteChoice)
    : undefined;
  return {
    enabled: raw?.enabled === true || choice === 'on',
    ...(choice ? { choice } : {}),
    windowDays: LITE_WINDOW_DAYS.includes(windowDays as typeof LITE_WINDOW_DAYS[number])
      ? windowDays
      : DEFAULT_LITE_OPTIONS.windowDays,
    serverFilter: raw?.serverFilter === true,
  };
};

/** Union of two room-id lists, order stable, no duplicates. */
export const unionRoomIds = (a: string[], b: string[]): string[] => {
  const seen = new Set(a);
  const out = [...a];
  b.forEach((roomId) => {
    if (seen.has(roomId)) return;
    seen.add(roomId);
    out.push(roomId);
  });
  return out;
};
