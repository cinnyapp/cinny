/*
 * Staged start-up: newest-first, two-stage replay of the saved /sync record.
 *
 * On a very large account the warm refresh is not waiting on the network: the
 * first live /sync is incremental and small. What the user waits for is
 * matrix-js-sdk replaying every kept room from the saved record in ONE
 * un-yielding task (`SyncApi.processSyncResponse`) before it emits PREPARED,
 * which is the only thing the app's loading gate listens to.
 *
 * This module splits that single call into stages, entirely in Cinny code and
 * without forking the SDK:
 *   stage 1 = the room in the URL + the rooms of the start-up snapshot + small
 *             space rooms + the most recent chats (≈40 rooms) → the app opens;
 *   stage 2 = the remaining rooms, in chunks, with a macrotask yield between
 *             chunks and a `cinny.replay` progress event after each one.
 *
 * Safe because: everything that must be processed exactly once (account_data,
 * presence, to_device, device_lists, one-time-key counts, invite/leave/knock)
 * travels in chunk 0 only; `notifEvents` is reset per call and only flushed for
 * live gappy syncs (`oldSyncToken` set), which are never chunked; the store /
 * accumulator is untouched (`doSync` persists the whole live response itself);
 * and `SyncApi.sync()` still awaits the whole cached replay before the first
 * live /sync is applied, so sending and receiving keep today's ordering.
 *
 * Kept free of app and SDK imports (types only) so it can be unit tested in
 * node: `npm run test:staged-replay`.
 */
import { lastAnyTs } from './lite-mode';
import type { LiteRawEvent, LiteRoomSyncData } from './lite-mode';

export const REPLAY_EVENT = 'cinny.replay';
/** Responses with this many joined rooms or fewer are handed through untouched. */
export const REPLAY_CHUNK_THRESHOLD = 120;
export const REPLAY_DEFAULT_FIRST = 40;
export const REPLAY_DEFAULT_CHUNK = 150;
/** The cold initial sync carries full state per room (6-8× heavier): smaller chunks keep it smooth. */
export const REPLAY_COLD_CHUNK = 50;
/** A space with more state events than this is a giant "one m.space.child per chat" space: stage 2. */
export const REPLAY_MAX_SPACE_STATE_EVENTS = 200;

export type ReplayHints = {
  /** the chat open in the current URL, if any */
  urlRoomId?: string;
  /** the chats of the start-up snapshot, in list order */
  snapshotRoomIds: string[];
  /** how many rooms make up stage 1 */
  firstCount: number;
  maxSpaceStateEvents: number;
};

export const defaultReplayHints = (): ReplayHints => ({
  snapshotRoomIds: [],
  firstCount: REPLAY_DEFAULT_FIRST,
  maxSpaceStateEvents: REPLAY_MAX_SPACE_STATE_EVENTS,
});

export type ReplayPlan = { first: string[]; rest: string[] };

export type ReplayStage = 'first' | 'progress' | 'done';

export type ReplayProgress = {
  stage: ReplayStage;
  /** rooms replayed so far */
  done: number;
  total: number;
  fromCache: boolean;
  /** false when the response was small enough to be processed in one go */
  chunked: boolean;
};

/** The shape of what the SDK hands to `processSyncResponse` (only what we touch). */
export type SyncResponseLike = {
  next_batch: string;
  rooms?: {
    join?: Record<string, LiteRoomSyncData>;
    invite?: Record<string, unknown>;
    leave?: Record<string, unknown>;
    knock?: Record<string, unknown>;
  };
  [key: string]: unknown;
};

export type SyncEventDataLike = {
  oldSyncToken?: string;
  nextSyncToken?: string;
  catchingUp?: boolean;
  fromCache?: boolean;
};

const stateEvents = (room: LiteRoomSyncData): LiteRawEvent[] =>
  room.state?.events ?? room['org.matrix.msc4222.state_after']?.events ?? [];

/** A space room whose state is small enough to replay in stage 1 (keeps the sidebar stable). */
export const isSmallSpace = (room: LiteRoomSyncData, maxStateEvents: number): boolean => {
  const events = stateEvents(room);
  if (events.length > maxStateEvents) return false;
  return events.some(
    (ev) =>
      ev.type === 'm.room.create' &&
      ev.state_key === '' &&
      (ev.content as { type?: unknown } | undefined)?.type === 'm.space'
  );
};

/**
 * Rank the joined rooms of a /sync response for replay: URL room, snapshot rooms
 * (in order), small spaces, then everything else newest-first (stable for ties).
 */
export const planReplayOrder = (
  join: Record<string, LiteRoomSyncData>,
  hints: ReplayHints
): ReplayPlan => {
  const ids = Object.keys(join);
  const front: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (seen.has(id) || !(id in join)) return;
    seen.add(id);
    front.push(id);
  };
  if (hints.urlRoomId) push(hints.urlRoomId);
  hints.snapshotRoomIds.forEach(push);
  ids.forEach((id) => {
    if (!seen.has(id) && isSmallSpace(join[id], hints.maxSpaceStateEvents)) push(id);
  });
  const others = ids
    .filter((id) => !seen.has(id))
    .map((id, index) => ({ id, index, ts: lastAnyTs(join[id]) }))
    .sort((a, b) => b.ts - a.ts || a.index - b.index)
    .map((r) => r.id);
  const ordered = front.concat(others);
  const firstCount = Math.max(0, Math.min(hints.firstCount, ordered.length));
  return { first: ordered.slice(0, firstCount), rest: ordered.slice(firstCount) };
};

const pick = <T>(src: Record<string, T>, keys: string[]): Record<string, T> => {
  const out: Record<string, T> = {};
  keys.forEach((k) => {
    out[k] = src[k];
  });
  return out;
};

/**
 * Re-key a saved /sync record's joined rooms in plan order. Same object
 * references — nothing is copied but the key list.
 */
export const orderSavedSync = <
  S extends { roomsData?: { join?: Record<string, LiteRoomSyncData> } }
>(
  saved: S,
  plan: ReplayPlan
): S => {
  const join = saved.roomsData?.join;
  if (!join) return saved;
  return {
    ...saved,
    roomsData: { ...saved.roomsData, join: pick(join, plan.first.concat(plan.rest)) },
  };
};

/**
 * Split one /sync response into chunks. Chunk 0 carries everything that is not
 * a joined room (account_data, presence, to_device, device_lists, key counts,
 * invite/leave/knock) plus the stage-1 rooms; later chunks carry ONLY
 * `{ next_batch, rooms: { join } }`. Returns `[data]` unchanged when the
 * response has `threshold` joined rooms or fewer.
 */
export const splitSyncResponse = <D extends SyncResponseLike>(
  data: D,
  plan: ReplayPlan,
  chunkSize = REPLAY_DEFAULT_CHUNK,
  threshold = REPLAY_CHUNK_THRESHOLD
): D[] => {
  const join = data.rooms?.join;
  if (!join) return [data];
  const keys = Object.keys(join);
  if (keys.length <= threshold) return [data];
  const known = new Set(keys);
  const ordered = plan.first.concat(plan.rest).filter((id) => known.has(id));
  // any room the plan does not know about (defensive) goes last
  if (ordered.length !== keys.length) {
    const planned = new Set(ordered);
    keys.forEach((id) => {
      if (!planned.has(id)) ordered.push(id);
    });
  }
  const firstCount = Math.min(plan.first.length, ordered.length);
  const chunks: D[] = [
    { ...data, rooms: { ...data.rooms, join: pick(join, ordered.slice(0, firstCount)) } },
  ];
  const size = Math.max(1, chunkSize);
  for (let i = firstCount; i < ordered.length; i += size) {
    chunks.push({
      next_batch: data.next_batch,
      rooms: { join: pick(join, ordered.slice(i, i + size)) },
    } as unknown as D);
  }
  return chunks;
};

/** Let the browser paint and handle input between chunks (macrotask yield). */
export const yieldToMain = (): Promise<void> => {
  const sched = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (sched && typeof sched.yield === 'function') return sched.yield();
  if (typeof MessageChannel === 'function') {
    return new Promise((resolve) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => {
        ch.port1.close();
        resolve();
      };
      ch.port2.postMessage(0);
    });
  }
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

export type ReplayState = {
  active: boolean;
  done: number;
  total: number;
  fromCache: boolean;
  /** ms, performance.now() of the first stage-1 emit of the current/last replay */
  startedAt?: number;
  finishedAt?: number;
};

const replayState: ReplayState = { active: false, done: 0, total: 0, fromCache: false };

/** Current replay progress for consumers that mount after the events were emitted. */
export const getReplayState = (): ReplayState => replayState;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const applyProgress = (p: ReplayProgress) => {
  if (p.stage === 'first' && !replayState.active) replayState.startedAt = now();
  replayState.active = p.stage !== 'done';
  replayState.done = p.done;
  replayState.total = p.total;
  replayState.fromCache = p.fromCache;
  if (p.stage === 'done') replayState.finishedAt = now();
};

/** The part of `SyncApi` (instance side) the wrapper touches. */
type SyncApiLike = {
  client: { emit: (event: string, ...args: unknown[]) => unknown };
  catchingUp?: boolean;
  processSyncResponse?: (syncEventData: SyncEventDataLike, data: SyncResponseLike) => Promise<void>;
};

type SyncApiPrototypeLike = {
  processSyncResponse?: (
    this: SyncApiLike,
    syncEventData: SyncEventDataLike,
    data: SyncResponseLike
  ) => Promise<void>;
  __cinnyStaged?: boolean;
};

export type StagedReplayOptions = {
  getHints: () => ReplayHints;
  chunkSize?: number;
  /** chunk size for the cold initial sync (not from cache) */
  coldChunkSize?: number;
  threshold?: number;
  /** test hook; defaults to a real macrotask yield */
  yieldFn?: () => Promise<void>;
};

/**
 * Wrap `SyncApi.prototype.processSyncResponse` (pass the real prototype, or a
 * fake in tests). Feature-detected: returns false and leaves today's path
 * untouched when the method is missing (an upstream SDK bump moved it) or when
 * it is already wrapped.
 */
export const installStagedReplay = (
  proto: SyncApiPrototypeLike | undefined,
  options: StagedReplayOptions
): boolean => {
  if (!proto || proto.__cinnyStaged || typeof proto.processSyncResponse !== 'function') {
    return false;
  }
  const original = proto.processSyncResponse;
  const chunkSize = options.chunkSize ?? REPLAY_DEFAULT_CHUNK;
  const coldChunkSize = options.coldChunkSize ?? REPLAY_COLD_CHUNK;
  const threshold = options.threshold ?? REPLAY_CHUNK_THRESHOLD;
  const doYield = options.yieldFn ?? yieldToMain;

  const emit = (api: SyncApiLike, p: ReplayProgress) => {
    applyProgress(p);
    try {
      api.client.emit(REPLAY_EVENT, p);
    } catch {
      // a listener threw — never let that break the sync loop
    }
  };

  const target = proto;
  // eslint-disable-next-line no-param-reassign
  target.processSyncResponse = async function stagedProcessSyncResponse(
    this: SyncApiLike,
    syncEventData: SyncEventDataLike,
    data: SyncResponseLike
  ): Promise<void> {
    const join = data?.rooms?.join;
    const total = join ? Object.keys(join).length : 0;
    const fromCache = !!syncEventData?.fromCache;
    // Only the cached replay and the very first (initial) live sync are chunked:
    // a live gappy sync with a saved token flushes notifEvents and must stay whole.
    const chunkable = total > threshold && (fromCache || !syncEventData?.oldSyncToken);
    if (!chunkable) {
      await original.call(this, syncEventData, data);
      if (fromCache) {
        emit(this, { stage: 'done', done: total, total, fromCache, chunked: false });
      }
      return;
    }
    const plan = planReplayOrder(join!, options.getHints());
    const chunks = splitSyncResponse(data, plan, fromCache ? chunkSize : coldChunkSize, threshold);
    let done = 0;
    let catching: boolean | undefined;
    try {
      for (let i = 0; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await original.call(this, syncEventData, chunks[i]);
        if (i === 0) catching = this.catchingUp;
        // later chunks carry no to_device: keep chunk 0's catching-up decision
        else if (catching !== undefined) this.catchingUp = catching;
        done += Object.keys(chunks[i].rooms?.join ?? {}).length;
        const last = i === chunks.length - 1;
        let stage: ReplayStage = 'progress';
        if (i === 0) stage = 'first';
        else if (last) stage = 'done';
        emit(this, {
          stage,
          done,
          total,
          fromCache,
          chunked: true,
        });
        // eslint-disable-next-line no-await-in-loop
        if (!last) await doYield();
      }
    } finally {
      if (replayState.active) {
        // a chunk threw: never leave listeners waiting
        emit(this, { stage: 'done', done, total, fromCache, chunked: true });
      }
    }
  };
  // eslint-disable-next-line no-param-reassign
  target.__cinnyStaged = true;
  return true;
};

/**
 * The room id in the current URL — matches both the hash router
 * (`/#/home/!room`) and the path router (`/home/!room`).
 */
export const roomIdFromLocation = (
  loc: { hash?: string; pathname?: string } | undefined = typeof window !== 'undefined'
    ? window.location
    : undefined
): string | undefined => {
  if (!loc) return undefined;
  const re = /(?:^|\/)(?:home|direct|space\/[^/]+)\/(![^/?#]+)/;
  const decode = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  const sources = [loc.hash ?? '', loc.pathname ?? ''];
  for (let i = 0; i < sources.length; i += 1) {
    const m = re.exec(decode(sources[i]));
    if (m) return m[1];
  }
  return undefined;
};
