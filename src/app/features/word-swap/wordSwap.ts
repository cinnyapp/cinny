import { createApiRequest } from '../../utils/blazeroomApi';

// Easter egg: the server's WORD_SWAPS (api/src/wordSwaps.js) turn one word into another as
// a message is sent. The new word is highlighted, and the message is tagged so everyone in
// the room gets the screen effect.
export type WordSwap = { from: string; to: string };

export const SWAPPED_KEY = 'com.blazeroom.swapped';

export const HIGHLIGHT_BG = '#FFD400';
export const HIGHLIGHT_FG = '#1A1A1A';

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Whole words only, any case: "Hello," matches "hello"; "Hellos" doesn't.
const swapPattern = (swaps: WordSwap[]) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])(${swaps.map((s) => escapeRegex(s.from)).join('|')})(?![\\p{L}\\p{N}])`,
    'giu'
  );

// Follows the typed word's case: HELLO → BYE, Hello → Bye, hello → bye.
export const matchCase = (typed: string, replacement: string): string => {
  if (typed.length > 1 && typed === typed.toUpperCase() && typed !== typed.toLowerCase()) {
    return replacement.toUpperCase();
  }
  const first = typed.charAt(0);
  if (first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
};

const replacementFor = (swaps: WordSwap[], typed: string) => {
  const swap = swaps.find((s) => s.from.toLowerCase() === typed.toLowerCase());
  return swap ? matchCase(typed, swap.to) : typed;
};

export const swapText = (text: string, swaps: WordSwap[]): { text: string; words: string[] } => {
  if (swaps.length === 0) return { text, words: [] };
  const words: string[] = [];
  const swapped = text.replace(swapPattern(swaps), (typed) => {
    const word = replacementFor(swaps, typed);
    words.push(word);
    return word;
  });
  return { text: swapped, words };
};

// Swaps in text only, never inside tags, links (mentions) or code, and highlights the result.
export const swapHtml = (html: string, swaps: WordSwap[]): string => {
  if (swaps.length === 0) return html;
  const pattern = swapPattern(swaps);
  let skipDepth = 0;
  return html
    .split(/(<[^>]*>)/)
    .map((part) => {
      const tag = /^<(\/?)(a|code|pre)\b/i.exec(part);
      if (tag) {
        skipDepth = Math.max(0, skipDepth + (tag[1] ? -1 : 1));
        return part;
      }
      if (part.startsWith('<') || skipDepth > 0) return part;
      return part.replace(
        pattern,
        (typed) =>
          `<span data-mx-bg-color="${HIGHLIGHT_BG}" data-mx-color="${HIGHLIGHT_FG}">${escapeHtml(
            replacementFor(swaps, typed)
          )}</span>`
      );
    })
    .join('');
};

export const swappedWords = (content: Record<string, unknown>): string[] => {
  const words = content[SWAPPED_KEY];
  if (!Array.isArray(words)) return [];
  return words.filter((word): word is string => typeof word === 'string').slice(0, 5);
};

export const fetchWordSwaps = async (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
): Promise<WordSwap[]> => {
  const res = await createApiRequest(getToken, fetchImpl)('/api/word-swaps', 'GET');
  const { swaps } = (await res.json()) as { swaps: WordSwap[] };
  return swaps;
};
