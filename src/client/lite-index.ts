/**
 * Lite mode, part 4: a small local index of the chats it skipped.
 *
 * Skipped chats are not loaded, so "Filter by name" cannot see them (QA
 * 2026-10-20: typing "Anastasia" found 7 chats before lite mode and 3 after).
 * When lite mode prunes a chat it therefore writes one tiny row for it here —
 * id, name, picture, time of the last message — and the name filter searches
 * these rows too. A match is shown in an "Older chats" group with a one-tap
 * "Load" (see `reviveSkippedRoom` in lite-revive.ts).
 *
 * Everything here is pure or takes the storage as an argument, so it is unit
 * tested without a browser: `npm run test:lite`.
 */

import { nameMatches } from '../app/utils/chatList';
import type { LiteRawEvent, LiteRoomSyncData } from './lite-mode';
import { lastAnyTs, lastMessageTs } from './lite-mode';

/** `[roomId, name, avatar mxc without "mxc://", last message ms]` — arrays keep the JSON small. */
export type LiteIndexRow = [id: string, name: string, avatar: string, ts: number];

export type LiteIndexEntry = { id: string; name: string; avatar?: string; ts: number };

export const LITE_INDEX_KEY = 'cinny_lite_index_v1';

const MXC_PREFIX = 'mxc://';

const events = (bucket?: { events?: LiteRawEvent[] }): LiteRawEvent[] => bucket?.events ?? [];

/** State events of a stored room, oldest first: the state block, then state changes in the timeline. */
const allStateEvents = (room: LiteRoomSyncData): LiteRawEvent[] => [
  ...events(room.state),
  ...events(room['org.matrix.msc4222.state_after']),
  ...events(room.timeline).filter((event) => typeof event.state_key === 'string'),
];

const localpart = (userId: string): string => userId.replace(/^@/, '').split(':')[0];

const heroesOf = (room: LiteRoomSyncData): string[] => {
  const heroes = room.summary?.['m.heroes'];
  return Array.isArray(heroes) ? heroes.filter((h): h is string => typeof h === 'string') : [];
};

/**
 * What the chat is called. The same order the app uses: the room's own name,
 * then its address, then the other people in it (for an unnamed 1:1 that is the
 * contact's name).
 */
export const deriveIndexName = (room: LiteRoomSyncData): string => {
  let name = '';
  let alias = '';
  const members = new Map<string, LiteRawEvent>();
  allStateEvents(room).forEach((event) => {
    if (event.state_key === '' && event.type === 'm.room.name') {
      const value = event.content?.name;
      name = typeof value === 'string' ? value.trim() : '';
    } else if (event.state_key === '' && event.type === 'm.room.canonical_alias') {
      const value = event.content?.alias;
      alias = typeof value === 'string' ? value : '';
    } else if (event.type === 'm.room.member' && typeof event.state_key === 'string') {
      members.set(event.state_key, event);
    }
  });
  if (name) return name;
  if (alias) return alias;
  const names = heroesOf(room)
    .map((id) => {
      const display = members.get(id)?.content?.displayname;
      return typeof display === 'string' && display.trim() ? display.trim() : localpart(id);
    })
    .filter(Boolean);
  return names.slice(0, 5).join(', ');
};

/** The chat's picture; an unnamed 1:1 falls back to the contact's own picture. */
export const deriveIndexAvatar = (room: LiteRoomSyncData): string => {
  let avatar = '';
  const memberAvatars = new Map<string, string>();
  allStateEvents(room).forEach((event) => {
    if (event.state_key === '' && event.type === 'm.room.avatar') {
      const value = event.content?.url;
      avatar = typeof value === 'string' ? value : '';
    } else if (event.type === 'm.room.member' && typeof event.state_key === 'string') {
      const value = event.content?.avatar_url;
      if (typeof value === 'string') memberAvatars.set(event.state_key, value);
    }
  });
  if (!avatar) {
    const heroes = heroesOf(room);
    if (heroes.length === 1) avatar = memberAvatars.get(heroes[0]) ?? '';
  }
  return avatar.startsWith(MXC_PREFIX) ? avatar.slice(MXC_PREFIX.length) : '';
};

/** One index row for a stored room (used while pruning, and for the background fill). */
export const makeIndexRow = (roomId: string, room: LiteRoomSyncData): LiteIndexRow => [
  roomId,
  deriveIndexName(room).slice(0, 80),
  deriveIndexAvatar(room),
  lastMessageTs(room) || lastAnyTs(room),
];

export const rowToEntry = (row: LiteIndexRow): LiteIndexEntry => ({
  id: row[0],
  name: row[1],
  ...(row[2] ? { avatar: `${MXC_PREFIX}${row[2]}` } : {}),
  ts: row[3],
});

/** Merge rows into a list: a newer row for the same chat replaces the old one. */
export const mergeIndexRows = (
  current: LiteIndexRow[],
  incoming: LiteIndexRow[]
): LiteIndexRow[] => {
  const byId = new Map<string, LiteIndexRow>();
  current.forEach((row) => byId.set(row[0], row));
  incoming.forEach((row) => {
    const old = byId.get(row[0]);
    // never replace a real name with an empty one (a chat we could not read this time)
    if (old && old[1] && !row[1]) return;
    byId.set(row[0], row);
  });
  return [...byId.values()];
};

export type LiteSearchOptions = {
  /** Chats that are loaded right now are not "older" any more. */
  isLoaded?: (roomId: string) => boolean;
  /** Narrow the group (Direct: only 1:1s; Home: no 1:1s, no space children). */
  accept?: (entry: LiteIndexEntry) => boolean;
  limit?: number;
};

/** Search the index by name: newest chat first. Pure. */
export const searchLiteIndex = (
  rows: LiteIndexRow[],
  query: string,
  { isLoaded, accept, limit = 50 }: LiteSearchOptions = {}
): LiteIndexEntry[] => {
  if (!query.trim()) return [];
  const out: LiteIndexEntry[] = [];
  rows.forEach((row) => {
    if (!row[1] || !nameMatches(row[1], query)) return;
    if (isLoaded?.(row[0])) return;
    const entry = rowToEntry(row);
    if (accept && !accept(entry)) return;
    out.push(entry);
  });
  out.sort((a, b) => b.ts - a.ts);
  return out.slice(0, limit);
};

/** Row time of a chat the server no longer lists for us: known, not worth asking about again. */
export const GONE_TS = -1;

/** Ids that are skipped but have no row yet (chats skipped before the index existed). */
export const idsMissingFromIndex = (skipped: string[], rows: LiteIndexRow[]): string[] => {
  const have = new Set(rows.map((row) => row[0]));
  return skipped.filter((id) => !have.has(id));
};

/**
 * What the one-time background fill has to look up, and whether it is worth a request:
 * every skipped chat with no row, and — once per device — the rows whose name could not
 * be worked out while pruning (a 1:1 whose contact's profile was not in the saved data).
 */
export const planIndexFill = (
  skipped: string[],
  rows: LiteIndexRow[],
  alreadyFilled: boolean
): { run: boolean; ids: string[] } => {
  const missing = idsMissingFromIndex(skipped, rows);
  const skippedSet = new Set(skipped);
  const weak = alreadyFilled
    ? []
    : rows.filter((r) => !r[1] && r[3] !== GONE_TS && skippedSet.has(r[0])).map((r) => r[0]);
  const ids = [...missing, ...weak];
  return { run: ids.length > 0, ids };
};

/** Rows for what the fill found: a chat the server did not return becomes a "gone" row. */
export const rowsFromNameSnapshot = (
  ids: string[],
  join: Record<string, LiteRoomSyncData | undefined>
): LiteIndexRow[] =>
  ids.map((id): LiteIndexRow => {
    const room = join[id];
    return room ? makeIndexRow(id, room) : [id, '', '', GONE_TS];
  });

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const defaultStorage = (): StorageLike | undefined => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

let cache: { rows: LiteIndexRow[]; storage?: StorageLike } | undefined;

const isRow = (row: unknown): row is LiteIndexRow =>
  Array.isArray(row) && typeof row[0] === 'string' && typeof row[1] === 'string';

export const readLiteIndex = (
  storage: StorageLike | undefined = defaultStorage()
): LiteIndexRow[] => {
  if (cache && cache.storage === storage) return cache.rows;
  let rows: LiteIndexRow[] = [];
  try {
    const raw = storage?.getItem(LITE_INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { v?: number; rows?: unknown[] };
      if (parsed?.v === 1 && Array.isArray(parsed.rows)) {
        rows = parsed.rows
          .filter(isRow)
          .map((row): LiteIndexRow => [row[0], row[1], row[2] || '', Number(row[3]) || 0]);
      }
    }
  } catch {
    rows = [];
  }
  cache = { rows, storage };
  return rows;
};

const listeners = new Set<() => void>();
/** Called after every change of the index (the background fill adds rows over time). */
export const subscribeLiteIndex = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const writeLiteIndex = (
  rows: LiteIndexRow[],
  storage: StorageLike | undefined = defaultStorage()
): void => {
  cache = { rows, storage };
  listeners.forEach((listener) => listener());
  try {
    storage?.setItem(LITE_INDEX_KEY, JSON.stringify({ v: 1, rows }));
  } catch {
    // quota: the search then only covers what fits; the chats are still skipped, not lost
  }
};

export const addToLiteIndex = (
  incoming: LiteIndexRow[],
  storage: StorageLike | undefined = defaultStorage()
): void => {
  if (incoming.length === 0) return;
  writeLiteIndex(mergeIndexRows(readLiteIndex(storage), incoming), storage);
};

const FILLED_KEY = 'cinny_lite_index_filled_v1';
export const isIndexFilled = (storage: StorageLike | undefined = defaultStorage()): boolean => {
  try {
    return storage?.getItem(FILLED_KEY) === '1';
  } catch {
    return false;
  }
};
export const markIndexFilled = (storage: StorageLike | undefined = defaultStorage()): void => {
  try {
    storage?.setItem(FILLED_KEY, '1');
  } catch {
    // ignore
  }
};

export const clearLiteIndexCache = (): void => {
  cache = undefined;
};
