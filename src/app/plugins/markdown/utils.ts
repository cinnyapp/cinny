/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { findAndReplace } from '../../utils/findAndReplace';
import { ESC_BLOCK_SEQ, UN_ESC_BLOCK_SEQ } from './block/rules';
import { EscapeRule, CAP_INLINE_SEQ } from './inline/rules';
import { runInlineRule } from './inline/runner';
import { replaceMatch } from './internal';

/**
 * Removes escape sequences from markdown inline elements in the given plain-text.
 * This function unescapes characters that are escaped with backslashes (e.g., `\*`, `\_`)
 * in markdown syntax, returning the original plain-text with markdown characters in effect.
 *
 * @param text - The input markdown plain-text containing escape characters (e.g., `"some \*italic\*"`)
 * @returns The plain-text with markdown escape sequences removed (e.g., `"some *italic*"`)
 */
export const unescapeMarkdownInlineSequences = (text: string): string =>
  runInlineRule(text, EscapeRule, (t) => {
    if (t === '') return t;
    return unescapeMarkdownInlineSequences(t);
  }) ?? text;

/**
 * Recovers the markdown escape sequences in the given plain-text.
 * This function adds backslashes (`\`) before markdown characters that may need escaping
 * (e.g., `*`, `_`) to ensure they are treated as literal characters and not part of markdown formatting.
 *
 * @param text - The input plain-text that may contain markdown sequences (e.g., `"some *italic*"`)
 * @returns The plain-text with markdown escape sequences added (e.g., `"some \*italic\*"`)
 */
export const escapeMarkdownInlineSequences = (text: string): string => {
  const regex = new RegExp(`(${CAP_INLINE_SEQ})`, 'g');
  const parts = findAndReplace(
    text,
    regex,
    (match) => {
      const [, g1] = match;
      return `\\${g1}`;
    },
    (t) => t
  );

  return parts.join('');
};

/**
 * Removes escape sequences from markdown block elements in the given plain-text.
 * This function unescapes characters that are escaped with backslashes (e.g., `\>`, `\#`)
 * in markdown syntax, returning the original plain-text with markdown characters in effect.
 *
 * @param {string} text - The input markdown plain-text containing escape characters (e.g., `\> block quote`).
 * @param {function} processPart - It takes the plain-text as input and returns a modified version of it.
 * @returns {string} The plain-text with markdown escape sequences removed and markdown formatting applied.
 */
export const unescapeMarkdownBlockSequences = (
  text: string,
  processPart: (text: string) => string
): string => {
  const match = text.match(ESC_BLOCK_SEQ);

  if (!match) return processPart(text);

  const [, g1] = match;
  return replaceMatch(text, match, g1, (t) => [processPart(t)]).join('');
};

/**
 * Escapes markdown block elements by adding backslashes before markdown characters
 * (e.g., `\>`, `\#`) that are normally interpreted as markdown syntax.
 *
 * @param {string} text - The input markdown plain-text that may contain markdown elements (e.g., `> block quote`).
 * @param {function} processPart - It takes the plain-text as input and returns a modified version of it.
 * @returns {string} The plain-text with markdown escape sequences added, preventing markdown formatting.
 */
export const escapeMarkdownBlockSequences = (
  text: string,
  processPart: (text: string) => string
): string => {
  const match = text.match(UN_ESC_BLOCK_SEQ);

  if (!match) return processPart(text);

  const [, g1] = match;
  return replaceMatch(text, match, `\\${g1}`, (t) => [processPart(t)]).join('');
};
