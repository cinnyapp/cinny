/**
 * Lite mode, part 5: bring ONE skipped chat back without reloading the app.
 *
 * Kept free of app imports (types only) so it can be unit tested in node:
 * `npm run test:lite`.
 */
import type { MatrixClient, Room } from 'matrix-js-sdk';

type RawEvent = Record<string, unknown>;

/** What matrix-js-sdk's own room builder (`SyncApi.processSyncResponse`) takes for one joined chat. */
type JoinedRoomData = {
  state?: { events: RawEvent[] };
  'org.matrix.msc4222.state_after'?: { events: RawEvent[] };
  timeline: { events: RawEvent[]; prev_batch?: string | null; limited?: boolean };
  ephemeral: { events: RawEvent[] };
  account_data: { events: RawEvent[] };
  unread_notifications: { notification_count: number; highlight_count: number };
  summary?: Record<string, unknown>;
};

type SyncLikeResponse = {
  next_batch: string;
  rooms?: { join?: Record<string, JoinedRoomData> };
};

type SyncApiLike = {
  processSyncResponse?: (
    syncEventData: { nextSyncToken?: string; catchingUp?: boolean; fromCache?: boolean },
    data: SyncLikeResponse
  ) => Promise<void>;
};

/** The slice of the client this needs (the real MatrixClient satisfies it). */
type RoomLoaderClient = Pick<MatrixClient, 'getRoom' | 'roomState' | 'http'>;

type MessagesPage = { chunk?: RawEvent[]; end?: string };

/** Chats being brought back by hand right now: the wake-up watcher leaves them alone. */
const reviving = new Set<string>();
export const isReviving = (roomId: string): boolean => reviving.has(roomId);

export const REVIVE_TIMELINE_LIMIT = 30;

/**
 * What a chat shows when it opens: the real messages. Bridged chats carry long
 * runs of name / picture / member changes that would otherwise fill the whole
 * first page (measured: the latest 30 events of a WhatsApp chat were all "changed
 * room name"). Scrolling back later is unfiltered, like any other chat.
 */
export const REVIVE_MESSAGE_TYPES = [
  'm.room.message',
  'm.room.encrypted',
  'm.sticker',
  'm.poll.start',
  'org.matrix.msc3381.poll.start',
];

const requestLatestMessages = (
  mx: RoomLoaderClient,
  roomId: string,
  filtered: boolean
): Promise<MessagesPage> =>
  mx.http.authedRequest<MessagesPage>(
    'GET' as never,
    `/rooms/${encodeURIComponent(roomId)}/messages`,
    {
      dir: 'b',
      limit: String(REVIVE_TIMELINE_LIMIT),
      filter: JSON.stringify(
        filtered
          ? { types: REVIVE_MESSAGE_TYPES, lazy_load_members: true }
          : { lazy_load_members: true }
      ),
    }
  );

const isGone = (err: unknown): boolean => {
  const e = err as { httpStatus?: number; errcode?: string; data?: { errcode?: string } };
  return (
    e?.httpStatus === 403 ||
    e?.httpStatus === 404 ||
    e?.errcode === 'M_FORBIDDEN' ||
    e?.data?.errcode === 'M_FORBIDDEN'
  );
};

/**
 * Bring ONE skipped chat back right now, without reloading the app.
 *
 * Two small reads of just this chat — its current state (`GET /rooms/{id}/state`)
 * and its latest messages (`GET /rooms/{id}/messages`) — are handed to
 * matrix-js-sdk's own room builder, the same code that rebuilds the saved chats
 * at startup, so the chat gets its name, picture, members and a place to scroll
 * back from like any other. (A one-room /sync is NOT an option: Synapse ignores
 * the room filter when deciding what to compute, so it costs a whole sync.)
 *
 * The data is given as `state_after` so the old messages cannot overwrite the
 * current state. Nothing is written into the saved copy (that would also
 * overwrite the app's sync position), so the chat stays on the skipped list and
 * the next start leaves it out again, unless it has new messages by then.
 */
export const reviveSkippedRoom = async (mx: RoomLoaderClient, roomId: string): Promise<Room> => {
  const existing = mx.getRoom(roomId);
  if (existing) return existing;
  const { syncApi } = mx as unknown as { syncApi?: SyncApiLike };
  if (!syncApi?.processSyncResponse) {
    throw new Error(
      'This version of the app cannot load a single old chat; use "Show older chats".'
    );
  }
  reviving.add(roomId);
  try {
    let state: RawEvent[];
    let page: MessagesPage;
    try {
      [state, page] = await Promise.all([
        mx.roomState(roomId) as unknown as Promise<RawEvent[]>,
        requestLatestMessages(mx, roomId, true),
      ]);
      // a chat with no message at all still opens with whatever it has
      if ((page.chunk ?? []).length === 0) page = await requestLatestMessages(mx, roomId, false);
    } catch (err) {
      if (isGone(err)) throw new Error('This chat is no longer on your account.');
      throw new Error('Could not reach the server to load this chat. Try again.');
    }
    // /messages gives newest first; a timeline is oldest first
    const timeline = [...(page.chunk ?? [])].reverse();
    const joined = state.filter(
      (event) =>
        event.type === 'm.room.member' &&
        (event.content as { membership?: string } | undefined)?.membership === 'join'
    ).length;
    const invited = state.filter(
      (event) =>
        event.type === 'm.room.member' &&
        (event.content as { membership?: string } | undefined)?.membership === 'invite'
    ).length;
    const join: JoinedRoomData = {
      'org.matrix.msc4222.state_after': { events: state },
      timeline: { events: timeline, prev_batch: page.end ?? null, limited: true },
      ephemeral: { events: [] },
      account_data: { events: [] },
      unread_notifications: { notification_count: 0, highlight_count: 0 },
      summary: { 'm.joined_member_count': joined, 'm.invited_member_count': invited },
    };
    await syncApi.processSyncResponse.call(
      syncApi,
      { nextSyncToken: undefined, catchingUp: false, fromCache: true },
      { next_batch: '', rooms: { join: { [roomId]: join } } }
    );
    const room = mx.getRoom(roomId);
    if (!room) throw new Error('Could not load this chat.');
    return room;
  } finally {
    reviving.delete(roomId);
  }
};

/**
 * One plain GET /sync that carries only what a name index needs (the chat's name,
 * picture, address, the people in it, its newest message). Used once, in the
 * background, to learn chats skipped before the index existed. It costs the
 * server one initial sync (about a minute), which is why it is done once and
 * only after the app has settled — never per chat.
 */
export const requestNameIndexSnapshot = (mx: MatrixClient): Promise<SyncLikeResponse> =>
  mx.http.authedRequest<SyncLikeResponse>('GET' as never, '/sync', {
    filter: JSON.stringify({
      presence: { not_types: ['*'] },
      account_data: { not_types: ['*'] },
      room: {
        account_data: { not_types: ['*'] },
        ephemeral: { not_types: ['*'] },
        timeline: { limit: 1, types: ['m.room.message', 'm.room.encrypted', 'm.sticker'] },
        state: {
          lazy_load_members: true,
          types: ['m.room.name', 'm.room.canonical_alias', 'm.room.avatar', 'm.room.member'],
        },
      },
    }),
    timeout: '0',
    set_presence: 'offline',
  });
