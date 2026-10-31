/*
 * Staged transfer of the saved /sync record from the store worker.
 *
 * matrix-js-sdk's worker store answers `getSavedSync` with the WHOLE record in
 * one message (13-19 MB on his account). The worker side is cheap, but the main
 * thread has to deserialise all of it in one task before the SDK can rebuild a
 * single room: measured 2026-10-21 as one 650-730 ms long task right in front
 * of stage 1 (several seconds on a phone).
 *
 * Here the worker plans the replay itself (same `planReplayOrder` as
 * client/staged-replay.ts: URL chat, start-up snapshot chats, newest first,
 * giant spaces last) and answers with ONLY the stage-1 rooms plus everything
 * that is not a joined room (account data, invites, …) and the ordered list of
 * the other room ids. The remaining rooms are fetched in chunks while stage 2
 * streams (`fetchRooms`), from a snapshot the worker took at that moment — so a
 * chunk never contains live /sync data that the main thread has not applied
 * yet (rooms a live /sync touches are pulled forward before their delta, see
 * `pullForward` in staged-replay.ts).
 *
 * Two halves in one file: `handleStagedCommand` runs in the worker
 * (indexeddb-worker.ts), `installStagedTransfer` on the main thread. Both are
 * feature-detected: any failure falls back to the SDK's own whole-record path,
 * and the commands are only installed together with the replay wrapper.
 */
import type { LiteRoomSyncData } from './lite-mode';
import { planReplayOrder, REPLAY_CHUNK_THRESHOLD, setRemoteRest } from './staged-replay';
import type { ReplayHints } from './staged-replay';
import { markStartup } from './startup-marks';

export const STAGED_GET = 'cinnyStagedGetSavedSync';
export const STAGED_ROOMS = 'cinnyStagedGetRooms';
export const STAGED_RELEASE = 'cinnyStagedRelease';

export type StagedGetOptions = {
  hints: ReplayHints;
  /** records with this many joined rooms or fewer are sent whole */
  threshold?: number;
};

type JoinMap = Record<string, LiteRoomSyncData>;

type SavedSyncLike = {
  nextBatch: string;
  roomsData: { join?: JoinMap; [k: string]: unknown };
  accountData: unknown[];
};

export type StagedReply = SavedSyncLike & {
  cinnyStaged?: { token: number; rest: string[]; total: number };
};

const pick = (src: JoinMap, ids: string[]): JoinMap => {
  const out: JoinMap = {};
  ids.forEach((id) => {
    if (id in src) out[id] = src[id];
  });
  return out;
};

/* ------------------------------------------------------------------ worker */

type WorkerCmd = { command?: unknown; seq?: unknown; args?: unknown[] };
export type StagedBackendLike = {
  getSavedSync?: (copy?: boolean) => Promise<SavedSyncLike | null>;
};

/** the snapshot of the record the main thread is still fetching chunks from */
let held: { token: number; join: JoinMap } | undefined;
let lastToken = 0;

/**
 * Worker side. Returns true when the message was one of ours (answered with the
 * same `cmd_success` / `cmd_fail` envelope the SDK's worker uses), false to let
 * the SDK's `IndexedDBStoreWorker` handle it.
 */
export const handleStagedCommand = (
  msg: WorkerCmd | undefined,
  getBackend: () => StagedBackendLike | undefined,
  post: (reply: unknown) => void
): boolean => {
  const command = msg?.command;
  if (command !== STAGED_GET && command !== STAGED_ROOMS && command !== STAGED_RELEASE) {
    return false;
  }
  const seq = msg?.seq;
  const ok = (result: unknown) => post({ command: 'cmd_success', seq, result });
  const fail = (err: unknown) =>
    post({
      command: 'cmd_fail',
      seq,
      error: {
        message: err instanceof Error ? err.message : String(err),
        name: 'StagedTransferError',
      },
    });
  try {
    if (command === STAGED_GET) {
      const backend = getBackend();
      if (!backend || typeof backend.getSavedSync !== 'function') {
        fail(new Error('store backend not ready'));
        return true;
      }
      const options = (msg?.args?.[0] ?? {}) as Partial<StagedGetOptions>;
      backend
        .getSavedSync(false)
        .then((saved) => {
          held = undefined;
          if (!saved) {
            ok(null);
            return;
          }
          const join = saved.roomsData?.join ?? {};
          const total = Object.keys(join).length;
          if (!options.hints || total <= (options.threshold ?? REPLAY_CHUNK_THRESHOLD)) {
            ok(saved);
            return;
          }
          const plan = planReplayOrder(join, options.hints);
          lastToken += 1;
          // getJSON() built fresh room objects for this call: they stay as they
          // are now even while live /sync data keeps being accumulated
          held = { token: lastToken, join };
          const reply: StagedReply = {
            ...saved,
            roomsData: { ...saved.roomsData, join: pick(join, plan.first) },
            cinnyStaged: { token: lastToken, rest: plan.rest, total },
          };
          ok(reply);
        })
        .catch(fail);
      return true;
    }
    const token = msg?.args?.[0];
    if (command === STAGED_ROOMS) {
      if (!held || held.token !== token) {
        fail(new Error('saved record already released'));
        return true;
      }
      const ids = Array.isArray(msg?.args?.[1]) ? (msg?.args?.[1] as string[]) : [];
      ok(pick(held.join, ids));
      return true;
    }
    if (held && held.token === token) held = undefined;
    ok(null);
  } catch (err) {
    fail(err);
  }
  return true;
};

/* ------------------------------------------------------------- main thread */

type RemoteBackendLike = {
  doCmd?: (command: string, args?: unknown[]) => Promise<unknown>;
};

type StoreLike = {
  backend?: RemoteBackendLike;
  getSavedSync?: () => Promise<unknown>;
  __cinnyStagedTransfer?: boolean;
};

/**
 * Main-thread side: wrap the store's `getSavedSync` (an instance field) so it
 * asks the worker for stage 1 only and registers the rest with the replay
 * wrapper. Only for the worker store (`backend.doCmd`); returns false — and
 * leaves the SDK path untouched — otherwise. Install it ONLY together with
 * `installStagedReplay`: without the wrapper nobody would fetch the rest.
 */
export const installStagedTransfer = (
  store: unknown,
  getHints: () => ReplayHints,
  threshold = REPLAY_CHUNK_THRESHOLD
): boolean => {
  const target = store as StoreLike | undefined;
  const backend = target?.backend;
  if (
    !target ||
    target.__cinnyStagedTransfer ||
    typeof target.getSavedSync !== 'function' ||
    !backend ||
    typeof backend.doCmd !== 'function'
  ) {
    return false;
  }
  const original = target.getSavedSync;
  const doCmd = (command: string, args?: unknown[]) =>
    (backend.doCmd as (c: string, a?: unknown[]) => Promise<unknown>).call(backend, command, args);

  target.getSavedSync = async function stagedGetSavedSync(this: unknown): Promise<unknown> {
    let reply: StagedReply | null;
    try {
      const options: StagedGetOptions = { hints: getHints(), threshold };
      reply = (await doCmd(STAGED_GET, [options])) as StagedReply | null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('staged startup: the store worker cannot send the record in parts', err);
      return original.call(this);
    }
    markStartup('saved-sync');
    if (!reply) return reply;
    const { cinnyStaged, ...saved } = reply;
    if (cinnyStaged && cinnyStaged.rest.length > 0) {
      const { token } = cinnyStaged;
      let whole: Promise<JoinMap> | undefined;
      setRemoteRest({
        rest: cinnyStaged.rest,
        total: cinnyStaged.total,
        fetchRooms: async (ids) => {
          try {
            return ((await doCmd(STAGED_ROOMS, [token, ids])) ?? {}) as JoinMap;
          } catch (err) {
            // never lose rooms: read the whole record once and take them from it
            // eslint-disable-next-line no-console
            console.warn('staged startup: chunk fetch failed, reading the whole record', err);
            whole =
              whole ??
              (doCmd('getSavedSync') as Promise<SavedSyncLike | null>)
                .then((r) => r?.roomsData?.join ?? {})
                .catch(() => ({}));
            return pick(await whole, ids);
          }
        },
        release: () => {
          doCmd(STAGED_RELEASE, [token]).catch(() => undefined);
        },
      });
    }
    return saved;
  };
  target.__cinnyStagedTransfer = true;
  return true;
};
