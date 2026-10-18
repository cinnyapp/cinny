/**
 * Tiny fuzzy matcher used by the Settings search field.
 *
 * It is deliberately dependency-free and deterministic so it can be unit
 * tested from plain node (see scripts/test-settings-search.mjs).
 *
 * Matching rules, best score first:
 *   1. the whole query is a prefix of the text          (score 1000)
 *   2. the whole query starts a word inside the text    (score  800)
 *   3. the whole query appears anywhere in the text     (score  600)
 *   4. the query's characters appear in order           (score  200..400)
 * A query of several words matches when EVERY word matches (AND), and the
 * result's score is the sum of the per-word scores.
 */

export type MatchRange = {
  /** index of the first matched character (inclusive) */
  start: number;
  /** index after the last matched character (exclusive) */
  end: number;
};

export type Match = {
  score: number;
  ranges: MatchRange[];
};

const WORD_BOUNDARY = /[\s\-_/&.,:;()[\]]/;

const isWordStart = (text: string, index: number): boolean =>
  index === 0 || WORD_BOUNDARY.test(text[index - 1]);

/** Merge overlapping/adjacent ranges and sort them, so highlighting is simple. */
export const mergeRanges = (ranges: MatchRange[]): MatchRange[] => {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: MatchRange[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i += 1) {
    const last = merged[merged.length - 1];
    const next = sorted[i];
    if (next.start <= last.end) {
      last.end = Math.max(last.end, next.end);
    } else {
      merged.push({ ...next });
    }
  }
  return merged;
};

/**
 * Match a single (already lower-cased, non-empty) term against `lowerText`.
 * Returns null when the term does not match at all.
 */
const matchTerm = (term: string, lowerText: string): Match | null => {
  const at = lowerText.indexOf(term);
  if (at === 0) {
    return { score: 1000, ranges: [{ start: 0, end: term.length }] };
  }
  if (at > 0) {
    const score = isWordStart(lowerText, at) ? 800 : 600;
    return { score, ranges: [{ start: at, end: at + term.length }] };
  }

  // Subsequence fallback: every character of the term, in order.
  const ranges: MatchRange[] = [];
  let cursor = 0;
  let wordStartHits = 0;
  for (let i = 0; i < term.length; i += 1) {
    const found = lowerText.indexOf(term[i], cursor);
    if (found === -1) return null;
    if (isWordStart(lowerText, found)) wordStartHits += 1;
    ranges.push({ start: found, end: found + 1 });
    cursor = found + 1;
  }
  // Prefer tight matches (few gaps) and matches that land on word starts.
  const span = ranges[ranges.length - 1].end - ranges[0].start;
  const density = term.length / Math.max(span, 1);
  const score = 200 + Math.round(density * 100) + wordStartHits * 20;
  return { score, ranges: mergeRanges(ranges) };
};

/**
 * Match `query` against `text`.
 *
 * Returns null when it does not match. An empty/whitespace query never
 * matches (callers treat "no query" as "show everything" themselves).
 */
export const fuzzyMatch = (query: string, text: string): Match | null => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;
  if (!text) return null;

  const lowerText = text.toLowerCase();
  let score = 0;
  const ranges: MatchRange[] = [];

  for (let i = 0; i < terms.length; i += 1) {
    const match = matchTerm(terms[i], lowerText);
    if (!match) return null;
    score += match.score;
    ranges.push(...match.ranges);
  }

  // Shorter texts are more likely to be the thing you meant.
  const brevityBonus = Math.max(0, 60 - text.length);
  return { score: score + brevityBonus, ranges: mergeRanges(ranges) };
};

/**
 * Split `text` into alternating plain / highlighted chunks for rendering.
 * Always returns the full text, in order.
 */
export const highlightChunks = (
  text: string,
  ranges: MatchRange[]
): Array<{ text: string; hit: boolean }> => {
  const merged = mergeRanges(ranges).filter((r) => r.start < text.length && r.end > r.start);
  if (merged.length === 0) return [{ text, hit: false }];

  const chunks: Array<{ text: string; hit: boolean }> = [];
  let cursor = 0;
  merged.forEach((range) => {
    if (range.start > cursor) chunks.push({ text: text.slice(cursor, range.start), hit: false });
    chunks.push({ text: text.slice(range.start, Math.min(range.end, text.length)), hit: true });
    cursor = Math.min(range.end, text.length);
  });
  if (cursor < text.length) chunks.push({ text: text.slice(cursor), hit: false });
  return chunks;
};
