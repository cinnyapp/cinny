/**
 * "When did something worth reading last happen in this chat?"
 *
 * The room list used to sort by `room.getLastActiveTimestamp()`, i.e. the newest
 * event of ANY kind. On a bridged account that is mostly noise: the bridges rename
 * puppets, swap avatars, re-send power levels and `m.bridge` state in bursts, so a
 * chat nobody wrote in for a year jumps to the top because its contact changed a
 * profile picture. This module defines activity the way a messaging app user
 * means it: the last *message* — from anyone, including you.
 *
 * Everything here is pure (no matrix-js-sdk runtime import), so it is unit tested
 * with plain objects (`npm run test:chat-list`).
 */

/**
 * The minimum shape of an event this module needs. `MatrixEvent` satisfies it, and
 * so does `rawEventLike()` for the raw JSON a `/messages` response returns.
 */
export type ActivityEvent = {
  /** Effective type (the decrypted type for an encrypted event, when known). */
  getType(): string;
  getTs(): number;
  getSender(): string | undefined | null;
  getStateKey(): string | undefined;
  getContent(): Record<string, unknown>;
  /** Content as sent; for an encrypted event this still carries `m.relates_to`. */
  getWireContent?(): Record<string, unknown>;
  getPrevContent?(): Record<string, unknown>;
};

/**
 * Event types that count as "someone said something". Mirrors the server-side
 * idea of a "bump" event (MSC4186 sliding sync: message, encrypted, sticker,
 * poll start, call invite) plus the newer call-ring notification events.
 */
export const MESSAGE_EVENT_TYPES: ReadonlySet<string> = new Set([
  'm.room.message',
  'm.room.encrypted',
  'm.sticker',
  'm.poll.start',
  'org.matrix.msc3381.poll.start',
  'm.call.invite',
  'm.rtc.notification',
  'org.matrix.msc4075.rtc.notification',
  'org.matrix.msc4075.call.notify',
]);

/** Relations that change an existing message instead of adding a new one. */
const NON_BUMPING_RELATIONS: ReadonlySet<string> = new Set(['m.replace', 'm.annotation']);

/** Bridge bot accounts: their notices are bookkeeping, not conversation. */
const BRIDGE_BOT_LOCALPART =
  /^@(whatsapp|telegram|signal|meta|facebook|messenger|instagram|linkedin|discord|slack|gmessages|googlechat|imessage|twitter|bluesky|irc|heisenbridge|bridge)?bot:/i;

export type ActivityKind =
  /** A real message — moves the chat. */
  | 'message'
  /** The chat started (created, or you joined) — moves it only while it has no messages. */
  | 'start'
  /** Anything else — never moves the chat. */
  | 'none';

const relationOf = (ev: ActivityEvent): string | undefined => {
  const content = ev.getWireContent?.() ?? ev.getContent();
  const rel = (content?.['m.relates_to'] as { rel_type?: unknown } | undefined)?.rel_type;
  return typeof rel === 'string' ? rel : undefined;
};

/** Classify one event. */
export const classifyActivityEvent = (
  ev: ActivityEvent,
  myUserId: string | undefined | null
): ActivityKind => {
  const type = ev.getType();

  if (MESSAGE_EVENT_TYPES.has(type)) {
    // An edit or a reaction is not a new message (WhatsApp/Telegram/Signal agree).
    const rel = relationOf(ev);
    if (rel && NON_BUMPING_RELATIONS.has(rel)) return 'none';
    if (type === 'm.room.message') {
      const sender = ev.getSender() ?? '';
      if (ev.getContent()?.msgtype === 'm.notice' && BRIDGE_BOT_LOCALPART.test(sender)) {
        return 'none';
      }
    }
    return 'message';
  }

  if (type === 'm.room.create') return 'start';

  if (type === 'm.room.member' && myUserId && ev.getStateKey() === myUserId) {
    // Only YOUR membership, and only the moment it began — not a profile change.
    const membership = ev.getContent()?.membership;
    const prev = ev.getPrevContent?.()?.membership;
    if ((membership === 'join' || membership === 'invite') && prev !== 'join') return 'start';
  }

  return 'none';
};

const contentMentionsMe = (ev: ActivityEvent, myUserId: string): boolean => {
  const mentions = ev.getContent()?.['m.mentions'] as { user_ids?: unknown } | undefined;
  return Array.isArray(mentions?.user_ids) && mentions.user_ids.includes(myUserId);
};

/** Is the user personally involved in this event (their own message, or a mention of them)? */
export const involvesMe = (
  ev: ActivityEvent,
  myUserId: string | undefined | null,
  isHighlight?: (ev: ActivityEvent) => boolean
): boolean => {
  if (!myUserId) return false;
  if (ev.getSender() === myUserId) return true;
  return contentMentionsMe(ev, myUserId) || !!isHighlight?.(ev);
};

/**
 * What the list knows about one chat.
 *  - `ts`: time of the last real message (or of the chat's start if it has none).
 *  - `mine`: last time YOU were involved (your message, a mention, you joined).
 *    Used to place muted chats, which should not be lifted by other people.
 *  - `known`: false when the loaded events contain no message at all, so `ts` is
 *    not trustworthy; `upper` is then the oldest loaded event — the last message is
 *    older than that, which is what the background lookup uses to decide priority.
 */
export type RoomActivity = {
  ts: number;
  mine: number;
  known: boolean;
  /** Set when `ts` came from a 'start' event only (no message seen yet). */
  startOnly?: boolean;
  upper?: number;
};

export const UNKNOWN_ACTIVITY: RoomActivity = { ts: 0, mine: 0, known: false };

/**
 * Compute a chat's activity from the events the client has loaded for it (oldest
 * first, as `timeline.getEvents()` returns them).
 *
 * Uses the events' own `origin_server_ts`, never their order: a bridge loading
 * old history appends old messages *after* newer ones, and those must not count as
 * new. Timestamps from the future (clock skew on a bridged network) are capped at
 * `now` so one bad clock cannot pin a chat to the top.
 */
export const computeRoomActivity = (
  events: readonly ActivityEvent[],
  myUserId: string | undefined | null,
  now: number,
  isHighlight?: (ev: ActivityEvent) => boolean
): RoomActivity => {
  let messageTs = 0;
  let startTs = 0;
  let mine = 0;
  let sawMessage = false;
  let sawStart = false;

  events.forEach((ev) => {
    const kind = classifyActivityEvent(ev, myUserId);
    if (kind === 'none') return;
    const ts = Math.min(ev.getTs(), now);
    if (kind === 'message') {
      sawMessage = true;
      if (ts > messageTs) messageTs = ts;
      if (ts > mine && involvesMe(ev, myUserId, isHighlight)) mine = ts;
    } else {
      sawStart = true;
      if (ts > startTs) startTs = ts;
      // Joining (or creating) a chat is your own doing.
      if (ts > mine) mine = ts;
    }
  });

  if (sawMessage) return { ts: messageTs, mine, known: true };
  if (sawStart) return { ts: startTs, mine, known: true, startOnly: true };
  return {
    ts: 0,
    mine,
    known: false,
    upper: events.length > 0 ? Math.min(events[0].getTs(), now) : undefined,
  };
};

/**
 * Fold a newer observation into what is already known. Never moves a chat
 * backwards in time, except that the first real message replaces a 'start'
 * placeholder (a portal created today for an old chat belongs where its last
 * message is, not at the top).
 */
export const mergeRoomActivity = (
  current: RoomActivity | undefined,
  next: RoomActivity
): RoomActivity => {
  if (!current || !current.known) {
    if (next.known) return { ...next, mine: Math.max(next.mine, current?.mine ?? 0) };
    return {
      ...next,
      mine: Math.max(next.mine, current?.mine ?? 0),
      upper: next.upper ?? current?.upper,
    };
  }
  if (!next.known) {
    return next.mine > current.mine ? { ...current, mine: next.mine } : current;
  }

  const mine = Math.max(current.mine, next.mine);
  if (current.startOnly && !next.startOnly) return { ts: next.ts, mine, known: true };
  if (!current.startOnly && next.startOnly) {
    return mine === current.mine ? current : { ...current, mine };
  }
  const ts = Math.max(current.ts, next.ts);
  if (ts === current.ts && mine === current.mine) return current;
  return { ...current, ts, mine };
};

/** Adapter so a raw event from a `/messages` response can be classified. */
export const rawEventLike = (raw: {
  type?: string;
  origin_server_ts?: number;
  sender?: string;
  state_key?: string;
  content?: Record<string, unknown>;
  unsigned?: { prev_content?: Record<string, unknown> };
}): ActivityEvent => ({
  getType: () => raw.type ?? '',
  getTs: () => raw.origin_server_ts ?? 0,
  getSender: () => raw.sender,
  getStateKey: () => raw.state_key,
  getContent: () => raw.content ?? {},
  getWireContent: () => raw.content ?? {},
  getPrevContent: () => raw.unsigned?.prev_content ?? {},
});

/** The `/messages` filter that returns only events that can count as a message. */
export const MESSAGE_LOOKUP_FILTER = {
  types: Array.from(MESSAGE_EVENT_TYPES),
  lazy_load_members: true,
};
