import { MatrixClient, MatrixEvent, Method, Room } from 'matrix-js-sdk';
import {
  buildRoomEventFilter,
  classifyEvent,
  GalleryCategory,
  GalleryItem,
  GalleryWalker,
  RawEvent,
} from './galleryWalker';
import { WalkerCache } from './walkerCache';

const cache = new WalkerCache(6);

export const walkerKey = (
  roomId: string,
  category: GalleryCategory,
  includeStickers: boolean,
  suffix = ''
) => `${roomId}|${category}|${includeStickers ? 's' : '-'}${suffix}`;

const decryptRaw =
  (mx: MatrixClient) =>
  async (raw: RawEvent): Promise<RawEvent> => {
    if (raw.type !== 'm.room.encrypted') return raw;
    const ev = new MatrixEvent(raw as any);
    await mx.decryptEventIfNeeded(ev);
    return { ...raw, type: ev.getType(), content: ev.getContent() };
  };

const asQuery = (q: Record<string, string | undefined>) => {
  const out: Record<string, string> = {};
  Object.entries(q).forEach(([k, v]) => {
    if (typeof v === 'string') out[k] = v;
  });
  return out;
};

export const roomMessagesFetcher =
  (mx: MatrixClient, roomId: string, filter: Record<string, unknown>) =>
  (dir: 'b' | 'f', from: string | undefined, limit: number) =>
    mx.http.authedRequest<{ chunk: RawEvent[]; start?: string; end?: string }>(
      Method.Get,
      `/rooms/${encodeURIComponent(roomId)}/messages`,
      asQuery({ dir, from, limit: String(limit), filter: JSON.stringify(filter) })
    );

/** One walker per (room, category, stickers), kept in a small LRU. */
export const getRoomWalker = (
  mx: MatrixClient,
  room: Room,
  category: GalleryCategory,
  includeStickers: boolean,
  suffix?: string,
  /** Only reuse a cached walker that already contains this event. */
  anchorEventId?: string
): { walker: GalleryWalker; key: string; reused: boolean } => {
  const key = walkerKey(room.roomId, category, includeStickers, suffix ?? '');
  const hit = cache.get(key);
  if (hit && !hit.getSnapshot().error && (!anchorEventId || hit.has(anchorEventId))) {
    return { walker: hit, key, reused: true };
  }

  const encrypted = room.hasEncryptionStateEvent();
  const filter = buildRoomEventFilter(category, encrypted, includeStickers);
  const walker = new GalleryWalker({
    fetchPage: roomMessagesFetcher(mx, room.roomId, filter),
    fetchContext: (eventId, limit) =>
      mx.http.authedRequest(
        Method.Get,
        `/rooms/${encodeURIComponent(room.roomId)}/context/${encodeURIComponent(eventId)}`,
        asQuery({ limit: String(limit), filter: JSON.stringify(filter) })
      ),
    decrypt: encrypted ? decryptRaw(mx) : undefined,
    classify: (ev) => classifyEvent(ev, { category, includeStickers }),
    pageLimit: encrypted ? 100 : 50,
    maxPagesPerCall: encrypted ? 8 : 4,
  });
  cache.set(key, walker);
  return { walker, key, reused: false };
};

export const peekRoomWalker = (key: string) => cache.get(key);

/** Builds a gallery item from an event already in memory (so the tap shows instantly). */
export const itemFromLocalEvent = (
  room: Room,
  eventId: string,
  includeStickers: boolean
): GalleryItem | undefined => {
  const ev = room.findEventById(eventId);
  if (!ev) return undefined;
  const raw: RawEvent = {
    event_id: eventId,
    type: ev.getType(),
    sender: ev.getSender() ?? '',
    origin_server_ts: ev.getTs(),
    content: ev.getContent(),
  };
  return classifyEvent(raw, { category: 'media', includeStickers });
};
