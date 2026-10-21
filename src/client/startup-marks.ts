/*
 * Start-up timeline marks (ms since navigation start), exposed on
 * `window.__cinnyStartup.marks` by sync-store-keeper.ts and as
 * `performance.mark('cinny:<name>')` entries, so a measurement harness can see
 * where a refresh spends its time without a CPU profile. First value wins.
 *
 * No imports: used by the store worker's main-thread side, the replay wrapper
 * and the app alike (and by the node unit tests).
 */
const marks: Record<string, number> = {};

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export const markStartup = (name: string): void => {
  if (marks[name] !== undefined) return;
  marks[name] = Math.round(now());
  try {
    performance.mark(`cinny:${name}`);
  } catch {
    // no User Timing API (node tests, old browsers): the record above is enough
  }
};

export const getStartupMarks = (): Record<string, number> => marks;
