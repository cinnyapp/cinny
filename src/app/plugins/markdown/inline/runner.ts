/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { MatchResult, replaceMatch } from '../internal';
import { InlineMDParser, InlineMDRule } from './type';

/**
 * Runs a single markdown rule on the provided text.
 *
 * @param text - The text to parse.
 * @param rule - The markdown rule to run.
 * @param parse - A function that run the parser on remaining parts.
 * @returns The text with the markdown rule applied or `undefined` if no match is found.
 */
export const runInlineRule = (
  text: string,
  rule: InlineMDRule,
  parse: InlineMDParser
): string | undefined => {
  const matchResult = rule.match(text);
  if (matchResult) {
    const content = rule.html(parse, matchResult);
    return replaceMatch(text, matchResult, content, (txt) => [parse(txt)]).join('');
  }
  return undefined;
};

/**
 * Runs multiple rules at the same time to better handle nested rules.
 * Rules will be run in the order they appear.
 *
 * @param text - The text to parse.
 * @param rules - The markdown rules to run.
 * @param parse - A function that run the parser on remaining parts.
 * @returns The text with the markdown rules applied or `undefined` if no match is found.
 */
export const runInlineRules = (
  text: string,
  rules: InlineMDRule[],
  parse: InlineMDParser
): string | undefined => {
  const matchResults = rules.map((rule) => rule.match(text));

  let targetRule: InlineMDRule | undefined;
  let targetResult: MatchResult | undefined;

  for (let i = 0; i < matchResults.length; i += 1) {
    const currentResult = matchResults[i];
    if (currentResult && typeof currentResult.index === 'number') {
      if (
        !targetResult ||
        (typeof targetResult?.index === 'number' && currentResult.index < targetResult.index)
      ) {
        targetResult = currentResult;
        targetRule = rules[i];
      }
    }
  }

  if (targetRule && targetResult) {
    const content = targetRule.html(parse, targetResult);
    return replaceMatch(text, targetResult, content, (txt) => [parse(txt)]).join('');
  }
  return undefined;
};
