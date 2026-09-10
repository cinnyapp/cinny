import { replaceMatch } from '../internal';
import { BlockMDParser, BlockMDRule } from './type';

/**
 * Parses block-level markdown text into HTML using defined block rules.
 *
 * @param text - The text to parse.
 * @param rule - The markdown rule to run.
 * @param parse - A function that run the parser on remaining parts..
 * @param parseInline - Optional function to parse inline elements.
 * @returns The text with the markdown rule applied or `undefined` if no match is found.
 */
export const runBlockRule = (
  text: string,
  rule: BlockMDRule,
  parse: BlockMDParser,
  parseInline?: (txt: string) => string
): string | undefined => {
  const matchResult = rule.match(text);
  if (matchResult) {
    const content = rule.html(matchResult, parse, parseInline);
    return replaceMatch(text, matchResult, content, (txt) => [parse(txt, parseInline)]).join('');
  }
  return undefined;
};
