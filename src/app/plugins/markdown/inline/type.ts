/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { MatchResult, MatchRule } from '../internal';

/**
 * Type for a function that parses inline markdown into HTML.
 *
 * @param text - The markdown text to be parsed.
 * @returns The parsed HTML.
 */
export type InlineMDParser = (text: string) => string;

/**
 * Type for a function that converts a match to output.
 *
 * @param parse - The inline markdown parser function.
 * @param match - The match result.
 * @returns The output string after processing the match.
 */
export type InlineMatchConverter = (parse: InlineMDParser, match: MatchResult) => string;

/**
 * Type representing a markdown rule that includes a matching pattern and HTML conversion.
 */
export type InlineMDRule = {
  match: MatchRule; // A function that matches a specific markdown pattern.
  html: InlineMatchConverter; // A function that converts the match to HTML.
};
