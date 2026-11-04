/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

/**
 * @typedef {RegExpMatchArray | RegExpExecArray} MatchResult
 *
 * Represents the result of a regular expression match.
 * This type can be either a `RegExpMatchArray` or a `RegExpExecArray`,
 * which are returned when performing a match with a regular expression.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match}
 */
export type MatchResult = RegExpMatchArray | RegExpExecArray;

/**
 * @typedef {function(string): MatchResult | null} MatchRule
 *
 * A function type that takes a string and returns a `MatchResult` or `null` if no match is found.
 *
 * @param {string} text The string to match against.
 * @returns {MatchResult | null} The result of the regular expression match, or `null` if no match is found.
 */
export type MatchRule = (text: string) => MatchResult | null;

/**
 * Returns the part of the text before a match.
 *
 * @param text - The input text string.
 * @param match - The match result (e.g., `RegExpMatchArray` or `RegExpExecArray`).
 * @returns A string containing the part of the text before the match.
 */
export const beforeMatch = (text: string, match: RegExpMatchArray | RegExpExecArray): string =>
  text.slice(0, match.index);

/**
 * Returns the part of the text after a match.
 *
 * @param text - The input text string.
 * @param match - The match result (e.g., `RegExpMatchArray` or `RegExpExecArray`).
 * @returns A string containing the part of the text after the match.
 */
export const afterMatch = (text: string, match: RegExpMatchArray | RegExpExecArray): string =>
  text.slice((match.index ?? 0) + match[0].length);

/**
 * Replaces a match in the text with a content.
 *
 * @param text - The input text string.
 * @param match - The match result (e.g., `RegExpMatchArray` or `RegExpExecArray`).
 * @param content - The content to replace the match with.
 * @param processPart - A function to further process remaining parts of the text.
 * @returns An array containing the processed parts of the text, including the content.
 */
export const replaceMatch = <C>(
  text: string,
  match: MatchResult,
  content: C,
  processPart: (txt: string) => Array<string | C>
): Array<string | C> => [
  ...processPart(beforeMatch(text, match)),
  content,
  ...processPart(afterMatch(text, match)),
];
