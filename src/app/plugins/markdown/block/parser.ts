import { replaceMatch } from '../internal';
import { BlockQuoteRule, CodeBlockRule, ESC_BLOCK_SEQ, HeadingRule, ListRule } from './rules';
import { runBlockRule } from './runner';
import { BlockMDParser } from './type';

/**
 * Parses block-level markdown text into HTML using defined block rules.
 *
 * @param text - The markdown text to be parsed.
 * @param parseInline - Optional function to parse inline elements.
 * @returns The parsed HTML or the original text if no block-level markdown was found.
 */
export const parseBlockMD: BlockMDParser = (text, parseInline) => {
  if (text === '') return text;
  let result: string | undefined;

  if (!result) result = runBlockRule(text, CodeBlockRule, parseBlockMD, parseInline);
  if (!result) result = runBlockRule(text, BlockQuoteRule, parseBlockMD, parseInline);
  if (!result) result = runBlockRule(text, ListRule, parseBlockMD, parseInline);
  if (!result) result = runBlockRule(text, HeadingRule, parseBlockMD, parseInline);

  // replace \n with <br/> because want to preserve empty lines
  if (!result) {
    result = text
      .split('\n')
      .map((lineText) => {
        const match = lineText.match(ESC_BLOCK_SEQ);
        if (!match) {
          return parseInline?.(lineText) ?? lineText;
        }

        const [, g1] = match;
        return replaceMatch(lineText, match, g1, (t) => [parseInline?.(t) ?? t]).join('');
      })
      .join('<br/>');
  }

  return result ?? text;
};
