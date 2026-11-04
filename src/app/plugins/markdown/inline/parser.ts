/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import {
  BoldRule,
  CodeRule,
  EscapeRule,
  ItalicRule1,
  ItalicRule2,
  LinkRule,
  SpoilerRule,
  StrikeRule,
  UnderlineRule,
} from './rules';
import { runInlineRule, runInlineRules } from './runner';
import { InlineMDParser } from './type';

const LeveledRules = [
  BoldRule,
  ItalicRule1,
  UnderlineRule,
  ItalicRule2,
  StrikeRule,
  SpoilerRule,
  LinkRule,
  EscapeRule,
];

/**
 * Parses inline markdown text into HTML using defined rules.
 *
 * @param text - The markdown text to be parsed.
 * @returns The parsed HTML or the original text if no markdown was found.
 */
export const parseInlineMD: InlineMDParser = (text) => {
  if (text === '') return text;
  let result: string | undefined;
  if (!result) result = runInlineRule(text, CodeRule, parseInlineMD);

  if (!result) result = runInlineRules(text, LeveledRules, parseInlineMD);

  return result ?? text;
};
