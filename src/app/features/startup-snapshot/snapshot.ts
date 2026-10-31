import { chatListMembership } from '../../utils/chatList';

/**
 * Startup snapshot: a tiny copy of the top of the chat list, saved while the app
 * runs and shown the instant the app opens — before matrix-js-sdk has finished
 * rebuilding thousands of chats from the saved /sync data (the "Heating up").
 *
 * localStorage on purpose: it is synchronous, so the list can be on screen in
 * the very first render, with no IndexedDB open/transaction in front of it.
 * Kept small (≤ 150 chats, ≤ 120 KB) so reading it costs well under a
 * millisecond.
 */

export type SnapshotRoom = {
  /** room id */
  id: string;
  name: string;
  /** http(s) thumbnail URL, already resolved */
  avatar?: string;
  dm?: boolean;
  /** the chat is a child of a space (so Home leaves it out unless "all chats in Home" is on) */
  parent?: boolean;
  /** unread count / highlight count at the time of saving */
  unread?: number;
  highlight?: number;
  muted?: boolean;
};

export type StartupSnapshot = {
  v: 1;
  userId: string;
  at: number;
  /** how many chats the app had loaded when this was saved */
  total: number;
  /** "show all chats in Home" at the time of saving */
  all?: boolean;
  rooms: SnapshotRoom[];
};

export const SNAPSHOT_MAX_ROOMS = 150;
export const SNAPSHOT_MAX_BYTES = 120_000;
const KEY_PREFIX = 'cinny_startup_snapshot_v1:';

export const snapshotKey = (userId: string) => `${KEY_PREFIX}${userId}`;

const cleanRoom = (r: SnapshotRoom): SnapshotRoom => {
  const out: SnapshotRoom = { id: r.id, name: (r.name || '').slice(0, 80) };
  if (r.avatar && /^https?:\/\//.test(r.avatar) && r.avatar.length < 600) out.avatar = r.avatar;
  if (r.dm) out.dm = true;
  if (r.parent) out.parent = true;
  if (r.unread && r.unread > 0) out.unread = Math.min(Math.floor(r.unread), 9999);
  if (r.highlight && r.highlight > 0) out.highlight = Math.min(Math.floor(r.highlight), 9999);
  if (r.muted) out.muted = true;
  return out;
};

/** Build the stored object: trimmed, sanitised, within the size budget. Pure. */
export const buildSnapshot = (
  userId: string,
  rooms: SnapshotRoom[],
  total: number,
  now?: number,
  all?: boolean
): StartupSnapshot => {
  let list = rooms
    .filter((r) => r && typeof r.id === 'string')
    .slice(0, SNAPSHOT_MAX_ROOMS)
    .map(cleanRoom);
  let snap: StartupSnapshot = {
    v: 1,
    userId,
    at: now ?? Date.now(),
    total,
    ...(all === undefined ? {} : { all }),
    rooms: list,
  };
  while (list.length > 10 && JSON.stringify(snap).length > SNAPSHOT_MAX_BYTES) {
    list = list.slice(0, Math.floor(list.length * 0.8));
    snap = { ...snap, rooms: list };
  }
  return snap;
};

/** Parse + validate what was stored. Anything odd → undefined (show the plain splash). */
export const parseSnapshot = (raw: string | null, userId: string): StartupSnapshot | undefined => {
  if (!raw) return undefined;
  try {
    const snap = JSON.parse(raw) as StartupSnapshot;
    if (!snap || snap.v !== 1 || snap.userId !== userId || !Array.isArray(snap.rooms)) {
      return undefined;
    }
    const rooms = snap.rooms
      .filter((r) => r && typeof r.id === 'string' && typeof r.name === 'string')
      .map(cleanRoom);
    if (rooms.length === 0) return undefined;
    return { ...snap, rooms, total: Number(snap.total) || rooms.length };
  } catch {
    return undefined;
  }
};

/**
 * Keep only the chats the real Home list will show with the CURRENT setting —
 * the same rule (`chatListMembership`) the real list uses: 1:1 chats belong to
 * Direct, space children are left out of Home, unless "show all chats in Home"
 * is on. Without this the instant list showed rooms (e.g. a space's chats) that
 * vanished the moment the real list loaded (QA 2026-10-20). Pure.
 */
export const snapshotForHome = (
  snap: StartupSnapshot | undefined,
  showAllRooms: boolean
): StartupSnapshot | undefined => {
  if (!snap) return undefined;
  const rooms = snap.rooms.filter((r) =>
    chatListMembership('home', {
      direct: !!r.dm,
      hasParent: !!r.parent,
      showAllRooms,
    })
  );
  if (rooms.length === 0) return undefined;
  return { ...snap, rooms };
};

/** Same content as last time (ignoring the timestamp)? Then do not rewrite it. */
export const sameSnapshot = (a: StartupSnapshot | undefined, b: StartupSnapshot): boolean =>
  !!a &&
  a.total === b.total &&
  a.all === b.all &&
  JSON.stringify(a.rooms) === JSON.stringify(b.rooms);

export const readSnapshot = (userId: string): StartupSnapshot | undefined => {
  try {
    return parseSnapshot(localStorage.getItem(snapshotKey(userId)), userId);
  } catch {
    return undefined;
  }
};

export const writeSnapshot = (snap: StartupSnapshot): void => {
  try {
    localStorage.setItem(snapshotKey(snap.userId), JSON.stringify(snap));
  } catch {
    // quota: the snapshot is only a nicety
  }
};

export const nameInitial = (name: string): string => {
  const m = name.trim().match(/[\p{L}\p{N}]/u);
  return (m ? m[0] : '#').toUpperCase();
};
