/**
 * Small scheduling helpers used to keep per-`/sync` work off the critical path.
 *
 * matrix-js-sdk emits one `RoomEvent.Timeline` / `RoomEvent.Receipt` per event of
 * every room in a `/sync` response. On an account with thousands of joined rooms a
 * single sync response can therefore fire hundreds of listeners, and if each one
 * writes to a jotai atom the whole subscriber tree re-renders hundreds of times in
 * a row. Coalescing those writes into a single flush turns that into one update.
 *
 * `setTimeout` is used instead of `requestAnimationFrame` on purpose: rAF does not
 * fire while the tab is hidden, so the work would pile up and then land in one big
 * burst the moment the user comes back to the app. Background timers are throttled
 * to roughly one per second, which is exactly the coalescing we want while hidden.
 */

export type Coalescer = {
  /** Request a run. Repeated calls before the flush are collapsed into one. */
  schedule: () => void;
  /** Cancel a pending run, if any. */
  cancel: () => void;
};

export const createCoalescer = (run: () => void): Coalescer => {
  let handle: ReturnType<typeof setTimeout> | undefined;

  return {
    schedule: () => {
      if (handle !== undefined) return;
      handle = setTimeout(() => {
        handle = undefined;
        run();
      }, 0);
    },
    cancel: () => {
      if (handle === undefined) return;
      clearTimeout(handle);
      handle = undefined;
    },
  };
};

export type ChunkedRun = {
  /** Abort the run. `onDone` will not be called. */
  cancel: () => void;
};

/**
 * Walk `items` in slices, yielding to the event loop between slices so a long scan
 * never becomes a single long task that freezes the UI. `onDone` runs after the
 * last slice.
 */
export const runChunked = <T>(
  items: readonly T[],
  chunkSize: number,
  each: (item: T) => void,
  onDone: () => void
): ChunkedRun => {
  let index = 0;
  let handle: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const step = () => {
    handle = undefined;
    if (cancelled) return;
    const end = Math.min(index + chunkSize, items.length);
    for (; index < end; index += 1) {
      each(items[index]);
    }
    if (index < items.length) {
      handle = setTimeout(step, 0);
      return;
    }
    onDone();
  };

  step();

  return {
    cancel: () => {
      cancelled = true;
      if (handle !== undefined) {
        clearTimeout(handle);
        handle = undefined;
      }
    },
  };
};
