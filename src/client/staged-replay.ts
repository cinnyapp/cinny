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
 * Stage 1 is all the SDK waits for: PREPARED fires right after it and the first
 * live /sync (sent in parallel at start-up) is applied immediately, so a
 * message that arrived while the tab was closed shows up seconds earlier than
 * after the whole replay. Stage 2 streams behind the open app in ONE serial
 * lane shared with live responses: a live /sync that mentions a room still in
 * stage 2 gets that room's cached copy replayed first, so per-room order
 * (saved history, then the live delta) always holds. A macrotask yield between
 * chunks lets the page paint and handle taps.
 *
 * Safe because: everything that must be processed exactly once (account_data,
 * presence, to_device, device_lists, one-time-key counts, invite/leave/knock)
 * travels in chunk 0 only; `notifEvents` is reset per call and only flushed for
 * live gappy syncs (`oldSyncToken` set), which are never chunked; the store /
 * accumulator is untouched (`doSync` persists the whole live response itself);
 * cached events are flagged `fromCache` by the SDK, so nothing in the app
 * treats them as live (`liveEvent` is false for them).
 *
 * Kept free of app and SDK imports (types only) so it can be unit tested in
 * node: `npm run test:staged-replay`.
 */
import { lastAnyTs } from './lite-mode';
import type { LiteRawEvent, LiteRoomSyncData } from './lite-mode';
import { markStartup } from './startup-marks';

export const REPLAY_EVENT = 'cinny.replay';
/** Responses with this many joined rooms or fewer are handed through untouched. */
export const REPLAY_CHUNK_THRESHOLD = 120;
export const REPLAY_DEFAULT_FIRST = 40;
/**
 * Stage-2 chunk size. Fixed on purpose: every chunk also costs one list rebuild
 * + React render behind the open app (~100-800 ms with 3,000 chats), so fewer,
 * larger chunks finish sooner — measured 2026-10-21: adaptive 8-15-room chunks
 * turned a 3 s stage 2 into 35-50 s.
 */
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

const isSpaceRoom = (room: LiteRoomSyncData): boolean =>
  stateEvents(room).some(
    (ev) =>
      ev.type === 'm.room.create' &&
      ev.state_key === '' &&
      (ev.content as { type?: unknown } | undefined)?.type === 'm.space'
  );

/** A space room whose state is small enough to replay in stage 1 (keeps the sidebar stable). */
export const isSmallSpace = (room: LiteRoomSyncData, maxStateEvents: number): boolean =>
  stateEvents(room).length <= maxStateEvents && isSpaceRoom(room);

/**
 * A giant "one m.space.child per chat" space (the bridged WhatsApp space has
 * 6,519 of them). Its timeline makes it look like the newest room, but every
 * one of those state events costs the app work when it lands behind an open
 * UI — it is always replayed LAST, in a chunk of its own.
 */
export const isGiantSpace = (room: LiteRoomSyncData, maxStateEvents: number): boolean =>
  stateEvents(room).length > maxStateEvents && isSpaceRoom(room);

/**
 * Rank the joined rooms of a /sync response for replay: URL room, snapshot rooms
 * (in order), small spaces, then everything else newest-first (stable for ties),
 * and giant spaces at the very end.
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
  const giant = new Set(ids.filter((id) => isGiantSpace(join[id], hints.maxSpaceStateEvents)));
  if (hints.urlRoomId && !giant.has(hints.urlRoomId)) push(hints.urlRoomId);
  hints.snapshotRoomIds.forEach((id) => {
    if (!giant.has(id)) push(id);
  });
  ids.forEach((id) => {
    if (!seen.has(id) && isSmallSpace(join[id], hints.maxSpaceStateEvents)) push(id);
  });
  const others = ids
    .filter((id) => !seen.has(id) && !giant.has(id))
    .map((id, index) => ({ id, index, ts: lastAnyTs(join[id]) }))
    .sort((a, b) => b.ts - a.ts || a.index - b.index)
    .map((r) => r.id);
  const ordered = front.concat(
    others,
    ids.filter((id) => giant.has(id))
  );
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
  /** diagnostics: which chunk is being processed right now */
  chunk?: number;
  chunks?: number;
  chunkStartedAt?: number;
  chunkRooms?: string[];
  slowChunks?: number;
  /** stage 2 streams behind the open app while the live /sync is already applied */
  background?: boolean;
  /** rooms the first live /sync touched and that were replayed ahead of their turn */
  pulledForward?: number;
  /** last stage-2 chunk: rooms and ms (the adaptive size is derived from these) */
  lastChunkRooms?: number;
  lastChunkMs?: number;
  /** 'staged': the store worker sent stage 1 only and the rest on demand (staged-transfer.ts) */
  transfer?: 'staged' | 'whole';
};

const replayState: ReplayState = { active: false, done: 0, total: 0, fromCache: false };
// readable from the console / a measurement harness
(globalThis as { __cinnyReplay?: ReplayState }).__cinnyReplay = replayState;
/** a chunk that takes longer than this is reported on the console (never expected) */
const SLOW_CHUNK_MS = 15_000;
/** stage-2 chunk sizes adapt between these bounds (rooms per chunk) */
export const REPLAY_MIN_CHUNK = 15;
export const REPLAY_MAX_CHUNK = 300;
/**
 * Opt-in (0 = off): adapt the stage-2 chunk size to this much wall-clock per
 * chunk. OFF by default — the SDK awaits the crypto store while replaying
 * encrypted rooms, so interleaved React renders and crypto work count against
 * the chunk and the size collapses (see REPLAY_DEFAULT_CHUNK).
 */
export const REPLAY_TARGET_CHUNK_MS = 0;

/**
 * The stage-2 rooms the store worker still holds (client/staged-transfer.ts):
 * the record arrived with stage 1 only, the rest is fetched chunk by chunk.
 */
export type RemoteRest = {
  /** room ids not sent yet, in replay order */
  rest: string[];
  /** joined rooms in the whole record */
  total: number;
  fetchRooms: (ids: string[]) => Promise<Record<string, LiteRoomSyncData>>;
  /** let the worker drop its copy (called once stage 2 is done) */
  release?: () => void;
};

let remoteRest: RemoteRest | undefined;

/** Called by the staged transfer right before the SDK gets the (partial) saved record. */
export const setRemoteRest = (rest: RemoteRest | undefined): void => {
  remoteRest = rest;
};

const takeRemoteRest = (): RemoteRest | undefined => {
  const r = remoteRest;
  remoteRest = undefined;
  return r;
};

/** Current replay progress for consumers that mount after the events were emitted. */
export const getReplayState = (): ReplayState => replayState;

/**
 * True while the staged replay is streaming rooms in behind the open app.
 * Every room that arrives then is brand new, so per-event listeners (which the
 * unstaged path never ran during the replay — the atoms mounted only after
 * PREPARED) can skip their work and rebuild once per chunk / at 'done'.
 */
export const isReplayActive = (): boolean => replayState.active;

type EmitterLike = {
  on: (ev: string, h: (p: ReplayProgress) => void) => unknown;
  removeListener: (ev: string, h: (p: ReplayProgress) => void) => unknown;
};

/** Subscribe to the replay's chunk events (first / progress / done); returns the unsubscriber. */
export const onReplayProgress = (
  mx: unknown,
  handler: (p: ReplayProgress) => void
): (() => void) => {
  const emitter = mx as EmitterLike;
  emitter.on(REPLAY_EVENT, handler);
  return () => {
    emitter.removeListener(REPLAY_EVENT, handler);
  };
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const applyProgress = (p: ReplayProgress) => {
  if (p.stage === 'first' && !replayState.active) replayState.startedAt = now();
  replayState.active = p.stage !== 'done';
  replayState.done = p.done;
  replayState.total = p.total;
  replayState.fromCache = p.fromCache;
  if (p.stage === 'done') {
    replayState.finishedAt = now();
    replayState.background = false;
  }
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
  /** stage-2 chunk size (cached replay); adapts only when `targetChunkMs` > 0 */
  chunkSize?: number;
  /** chunk size for the cold initial sync (not from cache) */
  coldChunkSize?: number;
  /** ms of wall-clock to aim for per stage-2 chunk; 0 (default) = keep `chunkSize` fixed */
  targetChunkMs?: number;
  threshold?: number;
  /** test hook; defaults to a real macrotask yield */
  yieldFn?: () => Promise<void>;
  /** test hook; defaults to performance.now() */
  nowFn?: () => number;
};

/**
 * The stage-2 work still to do for the current cached replay. While this is set
 * the SDK has already moved on (PREPARED fired, the first live /sync is being
 * applied) and the remaining rooms stream in behind the open app.
 */
type PendingReplay = {
  api: SyncApiLike;
  /** the cached syncEventData (fromCache: true, no oldSyncToken) */
  syncEventData: SyncEventDataLike;
  nextBatch: string;
  /** the saved data of these rooms: from the response in hand, or from the store worker */
  rooms: (ids: string[]) => Promise<Record<string, LiteRoomSyncData>>;
  release?: () => void;
  /** rooms not replayed yet, in plan order */
  pending: string[];
  done: number;
  total: number;
};

let pendingReplay: PendingReplay | undefined;
/**
 * One lane for everything that goes through `processSyncResponse` while stage 2
 * is pending: background chunks and live responses never overlap, so per-room
 * order (cached copy first, then the live delta) always holds.
 */
let lane: Promise<void> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = lane.then(fn, fn);
  lane = run.then(
    () => undefined,
    () => undefined
  );
  return run;
};
let idleWaiters: (() => void)[] = [];

/** Resolves once no stage-2 replay is streaming (immediately when none is). Tests + harness. */
export const whenReplayIdle = (): Promise<void> =>
  pendingReplay
    ? new Promise((resolve) => {
        idleWaiters.push(resolve);
      })
    : Promise.resolve();

/** The rooms of a live /sync response that are still waiting in stage 2. */
export const roomsStillPending = (data: SyncResponseLike, pending: Iterable<string>): string[] => {
  const { rooms } = data;
  if (!rooms) return [];
  const touched = new Set<string>();
  (['join', 'leave', 'invite', 'knock'] as const).forEach((k) => {
    const bucket = rooms[k];
    if (bucket) Object.keys(bucket).forEach((id) => touched.add(id));
  });
  if (touched.size === 0) return [];
  return Array.from(pending).filter((id) => touched.has(id));
};

const clampChunk = (n: number) =>
  Math.max(REPLAY_MIN_CHUNK, Math.min(REPLAY_MAX_CHUNK, Math.round(n)));

/**
 * Wrap `SyncApi.prototype.processSyncResponse` (pass the real prototype, or a
 * fake in tests). Feature-detected: returns false and leaves today's path
 * untouched when the method is missing (an upstream SDK bump moved it) or when
 * it is already wrapped.
 *
 * Cached replay (a normal refresh): stage 1 (the ~40 hottest rooms + everything
 * that is not a joined room) is processed and the call RETURNS — the SDK emits
 * PREPARED and applies the first live /sync (sent in parallel at start-up), so
 * a message that arrived while the tab was closed shows up right after the
 * cached ones. Stage 2 streams the remaining rooms behind the open app in
 * yielding, size-adapting chunks. A live response that mentions a room still
 * in stage 2 gets that room's cached copy replayed FIRST (same lane), so no
 * room ever sees its live delta before its saved history.
 *
 * Cold initial sync: chunked for a ticking counter, but awaited whole.
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
  const targetChunkMs = options.targetChunkMs ?? REPLAY_TARGET_CHUNK_MS;
  const threshold = options.threshold ?? REPLAY_CHUNK_THRESHOLD;
  const doYield = options.yieldFn ?? yieldToMain;
  const clock = options.nowFn ?? now;

  const emit = (api: SyncApiLike, p: ReplayProgress) => {
    applyProgress(p);
    try {
      api.client.emit(REPLAY_EVENT, p);
    } catch {
      // a listener threw — never let that break the sync loop
    }
  };

  const finish = (state: PendingReplay) => {
    if (pendingReplay !== state) return;
    pendingReplay = undefined;
    try {
      state.release?.();
    } catch {
      // the worker drops its copy on the next start anyway
    }
    markStartup('stage2-done');
    emit(state.api, {
      stage: 'done',
      done: state.done,
      total: state.total,
      fromCache: true,
      chunked: true,
    });
    const waiters = idleWaiters;
    idleWaiters = [];
    waiters.forEach((resolve) => resolve());
  };

  /** Replay `ids` from the saved record (cached syncEventData); catchingUp is left as it was. */
  const replayCached = async (state: PendingReplay, ids: string[]): Promise<void> => {
    const { api } = state;
    const before = api.catchingUp;
    replayState.chunkStartedAt = clock();
    replayState.chunkRooms = ids.slice(0, 3);
    const watchdog = setTimeout(() => {
      replayState.slowChunks = (replayState.slowChunks ?? 0) + 1;
      // eslint-disable-next-line no-console
      console.warn(
        `staged startup: a chunk of ${ids.length} rooms (from ${ids[0]}) is taking more than ${SLOW_CHUNK_MS} ms`
      );
    }, SLOW_CHUNK_MS);
    try {
      const join = await state.rooms(ids);
      await original.call(api, state.syncEventData, {
        next_batch: state.nextBatch,
        rooms: { join },
      });
    } catch (err) {
      // the unstaged SDK would have dropped the WHOLE cached replay here; we lose one chunk
      // eslint-disable-next-line no-console
      console.error('staged startup: a replay chunk failed, continuing with the next', err);
    } finally {
      clearTimeout(watchdog);
      // the saved record carries no to_device events, so the SDK would flip
      // catchingUp to false after every chunk — the live /sync decides that now
      if (before !== undefined) api.catchingUp = before;
    }
    // eslint-disable-next-line no-param-reassign
    state.done += ids.length;
  };

  /** A live response while stage 2 streams: replay the cached copy of every room it touches first. */
  const pullForward = async (state: PendingReplay, data: SyncResponseLike): Promise<void> => {
    const ids = roomsStillPending(data, state.pending);
    if (ids.length === 0) return;
    const set = new Set(ids);
    // eslint-disable-next-line no-param-reassign
    state.pending = state.pending.filter((id) => !set.has(id));
    replayState.pulledForward = (replayState.pulledForward ?? 0) + ids.length;
    await replayCached(state, ids);
    emit(state.api, {
      stage: 'progress',
      done: state.done,
      total: state.total,
      fromCache: true,
      chunked: true,
    });
  };

  /** One stage-2 chunk, taken inside the lane (a live response queued ahead may have pulled rooms forward). */
  const processNextChunk = async (
    state: PendingReplay,
    ctl: { size: number; index: number }
  ): Promise<void> => {
    const ids = state.pending.splice(0, ctl.size);
    if (ids.length === 0) return;
    // eslint-disable-next-line no-param-reassign
    ctl.index += 1;
    replayState.chunk = ctl.index;
    const t0 = clock();
    await replayCached(state, ids);
    const elapsed = Math.max(1, clock() - t0);
    replayState.lastChunkRooms = ids.length;
    replayState.lastChunkMs = Math.round(elapsed);
    // eslint-disable-next-line no-param-reassign
    if (targetChunkMs > 0) ctl.size = clampChunk((ids.length * targetChunkMs) / elapsed);
    if (state.pending.length > 0) {
      emit(state.api, {
        stage: 'progress',
        done: state.done,
        total: state.total,
        fromCache: true,
        chunked: true,
      });
    }
  };

  /** Stage 2: the remaining rooms, newest-first, in yielding chunks sized to ~targetChunkMs. */
  const runBackground = async (state: PendingReplay): Promise<void> => {
    const ctl = { size: clampChunk(chunkSize), index: 0 };
    try {
      while (pendingReplay === state && state.pending.length > 0) {
        // eslint-disable-next-line no-await-in-loop
        await doYield();
        // eslint-disable-next-line no-await-in-loop
        await serial(() => processNextChunk(state, ctl));
      }
    } finally {
      finish(state);
    }
  };

  /**
   * Stage 1 (`first`: everything that is not a joined room + the hottest
   * rooms) is processed and awaited — it is all the SDK waits for: PREPARED and
   * the first live /sync follow right after. The `rest` streams in behind the
   * open app, never awaited by the SDK.
   */
  const startStaged = async (
    api: SyncApiLike,
    syncEventData: SyncEventDataLike,
    first: SyncResponseLike,
    rest: string[],
    total: number,
    source: Pick<PendingReplay, 'rooms' | 'release'>
  ): Promise<void> => {
    if (pendingReplay) finish(pendingReplay); // a client restart mid-replay: start clean
    replayState.chunks = undefined;
    replayState.slowChunks = 0;
    replayState.pulledForward = 0;
    replayState.chunk = 0;
    replayState.transfer = source.release ? 'staged' : 'whole';
    markStartup('stage1-start');
    try {
      await serial(() => original.call(api, syncEventData, first));
    } catch (err) {
      // the unstaged SDK would have dropped the WHOLE cached replay here
      // eslint-disable-next-line no-console
      console.error('staged startup: stage 1 failed, continuing with the older chats', err);
    }
    markStartup('stage1-end');
    const done = Object.keys(first.rooms?.join ?? {}).length;
    const state: PendingReplay = {
      api,
      syncEventData,
      nextBatch: first.next_batch,
      rooms: source.rooms,
      release: source.release,
      pending: rest,
      done,
      total,
    };
    pendingReplay = state;
    replayState.background = true;
    emit(api, { stage: 'first', done, total, fromCache: true, chunked: true });
    if (rest.length === 0) {
      finish(state);
      return;
    }
    // never awaited by the SDK: the rest streams in behind the open app
    runBackground(state).catch(() => undefined);
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
    const remote = fromCache ? takeRemoteRest() : undefined;
    if (remote) {
      // the store worker sent stage 1 only (client/staged-transfer.ts)
      await startStaged(this, syncEventData, data, remote.rest, total + remote.rest.length, {
        rooms: remote.fetchRooms,
        release: remote.release,
      });
      return;
    }
    // Only the cached replay and the very first (initial) live sync are chunked:
    // a live gappy sync with a saved token flushes notifEvents and must stay whole.
    const chunkable = total > threshold && (fromCache || !syncEventData?.oldSyncToken);
    if (!chunkable) {
      const state = pendingReplay;
      if (!fromCache && state) {
        // live /sync while stage 2 streams: same lane, cached copies first
        await serial(async () => {
          await pullForward(state, data);
          await original.call(this, syncEventData, data);
        });
        return;
      }
      await original.call(this, syncEventData, data);
      if (fromCache) {
        emit(this, { stage: 'done', done: total, total, fromCache, chunked: false });
      }
      return;
    }
    const plan = planReplayOrder(join!, options.getHints());

    if (fromCache) {
      const chunks = splitSyncResponse(data, plan, Number.MAX_SAFE_INTEGER, threshold);
      const rest = chunks.slice(1).flatMap((c) => Object.keys(c.rooms?.join ?? {}));
      const local = join!;
      await startStaged(this, syncEventData, chunks[0], rest, total, {
        rooms: async (ids) => pick(local, ids),
      });
      return;
    }

    // cold initial sync: chunked (ticking counter, paints between chunks) but awaited whole
    const chunks = splitSyncResponse(data, plan, coldChunkSize, threshold);
    let done = 0;
    let catching: boolean | undefined;
    replayState.chunks = chunks.length;
    replayState.slowChunks = 0;
    replayState.background = false;
    try {
      for (let i = 0; i < chunks.length; i += 1) {
        const rooms = Object.keys(chunks[i].rooms?.join ?? {});
        replayState.chunk = i;
        replayState.chunkStartedAt = clock();
        replayState.chunkRooms = rooms.slice(0, 3);
        const watchdog = setTimeout(() => {
          replayState.slowChunks = (replayState.slowChunks ?? 0) + 1;
          // eslint-disable-next-line no-console
          console.warn(
            `staged startup: chunk ${i + 1}/${chunks.length} (${rooms.length} rooms, from ${
              rooms[0]
            }) is taking more than ${SLOW_CHUNK_MS} ms`
          );
        }, SLOW_CHUNK_MS);
        try {
          // eslint-disable-next-line no-await-in-loop
          await original.call(this, syncEventData, chunks[i]);
        } finally {
          clearTimeout(watchdog);
        }
        if (i === 0) catching = this.catchingUp;
        // later chunks carry no to_device: keep chunk 0's catching-up decision
        else if (catching !== undefined) this.catchingUp = catching;
        done += rooms.length;
        const last = i === chunks.length - 1;
        let stage: ReplayStage = 'progress';
        if (i === 0) stage = 'first';
        else if (last) stage = 'done';
        emit(this, { stage, done, total, fromCache, chunked: true });
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
