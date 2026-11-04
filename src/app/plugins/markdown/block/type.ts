// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { MatchResult, MatchRule } from '../internal';

/**
 * Type for a function that parses block-level markdown into HTML.
 *
 * @param text - The markdown text to be parsed.
 * @param parseInline - Optional function to parse inline elements.
 * @returns The parsed HTML.
 */
export type BlockMDParser = (text: string, parseInline?: (txt: string) => string) => string;

/**
 * Type for a function that converts a block match to output.
 *
 * @param match - The match result.
 * @param parseInline - Optional function to parse inline elements.
 * @returns The output string after processing the match.
 */
export type BlockMatchConverter = (
  match: MatchResult,
  parseInline?: (txt: string) => string
) => string;

/**
 * Type representing a block-level markdown rule that includes a matching pattern and HTML conversion.
 */
export type BlockMDRule = {
  match: MatchRule; // A function that matches a specific markdown pattern.
  html: BlockMatchConverter; // A function that converts the match to HTML.
};
