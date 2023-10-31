export type MatchResult = RegExpMatchArray | RegExpExecArray;
export type RuleMatch = (text: string) => MatchResult | null;

export const beforeMatch = (text: string, match: RegExpMatchArray | RegExpExecArray): string =>
  text.slice(0, match.index);
export const afterMatch = (text: string, match: RegExpMatchArray | RegExpExecArray): string =>
  text.slice((match.index ?? 0) + match[0].length);

export const replaceMatch = <C>(
  convertPart: (txt: string) => Array<string | C>,
  text: string,
  match: MatchResult,
  content: C
): Array<string | C> => [
  ...convertPart(beforeMatch(text, match)),
  content,
  ...convertPart(afterMatch(text, match)),
];

/*
 *****************
 * INLINE PARSER *
 *****************
 */

export type InlineMDParser = (text: string) => string;

export type InlineMatchConverter = (parse: InlineMDParser, match: MatchResult) => string;

export type InlineMDRule = {
  match: RuleMatch;
  html: InlineMatchConverter;
};

export type InlineRuleRunner = (
  parse: InlineMDParser,
  text: string,
  rule: InlineMDRule
) => string | undefined;
export type InlineRulesRunner = (
  parse: InlineMDParser,
  text: string,
  rules: InlineMDRule[]
) => string | undefined;

const MIN_ANY = '(.+?)';
const URL_NEG_LB = '(?<!(https?|ftp|mailto|magnet):\\/\\/\\S*)';

const BOLD_MD_1 = '**';
const BOLD_PREFIX_1 = '\\*{2}';
const BOLD_NEG_LA_1 = '(?!\\*)';
const BOLD_REG_1 = new RegExp(
  `${URL_NEG_LB}${BOLD_PREFIX_1}${MIN_ANY}${BOLD_PREFIX_1}${BOLD_NEG_LA_1}`
);
const BoldRule: InlineMDRule = {
  match: (text) => text.match(BOLD_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<strong data-md="${BOLD_MD_1}">${parse(g2)}</strong>`;
  },
};

const ITALIC_MD_1 = '*';
const ITALIC_PREFIX_1 = '\\*';
const ITALIC_NEG_LA_1 = '(?!\\*)';
const ITALIC_REG_1 = new RegExp(
  `${URL_NEG_LB}${ITALIC_PREFIX_1}${MIN_ANY}${ITALIC_PREFIX_1}${ITALIC_NEG_LA_1}`
);
const ItalicRule1: InlineMDRule = {
  match: (text) => text.match(ITALIC_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<i data-md="${ITALIC_MD_1}">${parse(g2)}</i>`;
  },
};

const ITALIC_MD_2 = '_';
const ITALIC_PREFIX_2 = '_';
const ITALIC_NEG_LA_2 = '(?!_)';
const ITALIC_REG_2 = new RegExp(
  `${URL_NEG_LB}${ITALIC_PREFIX_2}${MIN_ANY}${ITALIC_PREFIX_2}${ITALIC_NEG_LA_2}`
);
const ItalicRule2: InlineMDRule = {
  match: (text) => text.match(ITALIC_REG_2),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<i data-md="${ITALIC_MD_2}">${parse(g2)}</i>`;
  },
};

const UNDERLINE_MD_1 = '__';
const UNDERLINE_PREFIX_1 = '_{2}';
const UNDERLINE_NEG_LA_1 = '(?!_)';
const UNDERLINE_REG_1 = new RegExp(
  `${URL_NEG_LB}${UNDERLINE_PREFIX_1}${MIN_ANY}${UNDERLINE_PREFIX_1}${UNDERLINE_NEG_LA_1}`
);
const UnderlineRule: InlineMDRule = {
  match: (text) => text.match(UNDERLINE_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<u data-md="${UNDERLINE_MD_1}">${parse(g2)}</u>`;
  },
};

const STRIKE_MD_1 = '~~';
const STRIKE_PREFIX_1 = '~{2}';
const STRIKE_NEG_LA_1 = '(?!~)';
const STRIKE_REG_1 = new RegExp(
  `${URL_NEG_LB}${STRIKE_PREFIX_1}${MIN_ANY}${STRIKE_PREFIX_1}${STRIKE_NEG_LA_1}`
);
const StrikeRule: InlineMDRule = {
  match: (text) => text.match(STRIKE_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<del data-md="${STRIKE_MD_1}">${parse(g2)}</del>`;
  },
};

const CODE_MD_1 = '`';
const CODE_PREFIX_1 = '`';
const CODE_NEG_LA_1 = '(?!`)';
const CODE_REG_1 = new RegExp(`${URL_NEG_LB}${CODE_PREFIX_1}(.+?)${CODE_PREFIX_1}${CODE_NEG_LA_1}`);
const CodeRule: InlineMDRule = {
  match: (text) => text.match(CODE_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<code data-md="${CODE_MD_1}">${g2}</code>`;
  },
};

const SPOILER_MD_1 = '||';
const SPOILER_PREFIX_1 = '\\|{2}';
const SPOILER_NEG_LA_1 = '(?!\\|)';
const SPOILER_REG_1 = new RegExp(
  `${URL_NEG_LB}${SPOILER_PREFIX_1}${MIN_ANY}${SPOILER_PREFIX_1}${SPOILER_NEG_LA_1}`
);
const SpoilerRule: InlineMDRule = {
  match: (text) => text.match(SPOILER_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<span data-md="${SPOILER_MD_1}" data-mx-spoiler>${parse(g2)}</span>`;
  },
};

const LINK_ALT = `\\[${MIN_ANY}\\]`;
const LINK_URL = `\\((https?:\\/\\/.+?)\\)`;
const LINK_REG_1 = new RegExp(`${LINK_ALT}${LINK_URL}`);
const LinkRule: InlineMDRule = {
  match: (text) => text.match(LINK_REG_1),
  html: (parse, match) => {
    const [, g1, g2] = match;
    return `<a data-md href="${g2}">${parse(g1)}</a>`;
  },
};

const runInlineRule: InlineRuleRunner = (parse, text, rule) => {
  const matchResult = rule.match(text);
  if (matchResult) {
    const content = rule.html(parse, matchResult);
    return replaceMatch((txt) => [parse(txt)], text, matchResult, content).join('');
  }
  return undefined;
};

/**
 * Runs multiple rules at the same time to better handle nested rules.
 * Rules will be run in the order they appear.
 */
const runInlineRules: InlineRulesRunner = (parse, text, rules) => {
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
    return replaceMatch((txt) => [parse(txt)], text, targetResult, content).join('');
  }
  return undefined;
};

const LeveledRules = [
  BoldRule,
  ItalicRule1,
  UnderlineRule,
  ItalicRule2,
  StrikeRule,
  SpoilerRule,
  LinkRule,
];

export const parseInlineMD: InlineMDParser = (text) => {
  if (text === '') return text;
  let result: string | undefined;
  if (!result) result = runInlineRule(parseInlineMD, text, CodeRule);

  if (!result) result = runInlineRules(parseInlineMD, text, LeveledRules);

  return result ?? text;
};

/*
 ****************
 * BLOCK PARSER *
 ****************
 */

export type BlockMDParser = (test: string, parseInline?: (txt: string) => string) => string;

export type BlockMatchConverter = (
  match: MatchResult,
  parseInline?: (txt: string) => string
) => string;

export type BlockMDRule = {
  match: RuleMatch;
  html: BlockMatchConverter;
};

export type BlockRuleRunner = (
  parse: BlockMDParser,
  text: string,
  rule: BlockMDRule,
  parseInline?: (txt: string) => string
) => string | undefined;

const HEADING_REG_1 = /^(#{1,6}) +(.+)\n?/m;
const HeadingRule: BlockMDRule = {
  match: (text) => text.match(HEADING_REG_1),
  html: (match, parseInline) => {
    const [, g1, g2] = match;
    const level = g1.length;
    return `<h${level} data-md="${g1}">${parseInline ? parseInline(g2) : g2}</h${level}>`;
  },
};

const CODEBLOCK_MD_1 = '```';
const CODEBLOCK_REG_1 = /^`{3}(\S*)\n((?:.*\n)+?)`{3} *(?!.)\n?/m;
const CodeBlockRule: BlockMDRule = {
  match: (text) => text.match(CODEBLOCK_REG_1),
  html: (match) => {
    const [, g1, g2] = match;
    const classNameAtt = g1 ? ` class="language-${g1}"` : '';
    return `<pre data-md="${CODEBLOCK_MD_1}"><code${classNameAtt}>${g2}</code></pre>`;
  },
};

const BLOCKQUOTE_MD_1 = '>';
const QUOTE_LINE_PREFIX = /^> */;
const BLOCKQUOTE_TRAILING_NEWLINE = /\n$/;
const BLOCKQUOTE_REG_1 = /(^>.*\n?)+/m;
const BlockQuoteRule: BlockMDRule = {
  match: (text) => text.match(BLOCKQUOTE_REG_1),
  html: (match, parseInline) => {
    const [blockquoteText] = match;

    const lines = blockquoteText
      .replace(BLOCKQUOTE_TRAILING_NEWLINE, '')
      .split('\n')
      .map((lineText) => {
        const line = lineText.replace(QUOTE_LINE_PREFIX, '');
        if (parseInline) return `${parseInline(line)}<br/>`;
        return `${line}<br/>`;
      })
      .join('');
    return `<blockquote data-md="${BLOCKQUOTE_MD_1}">${lines}</blockquote>`;
  },
};

const ORDERED_LIST_MD_1 = '-';
const O_LIST_ITEM_PREFIX = /^(-|[\da-zA-Z]\.) */;
const O_LIST_START = /^([\d])\./;
const O_LIST_TYPE = /^([aAiI])\./;
const O_LIST_TRAILING_NEWLINE = /\n$/;
const ORDERED_LIST_REG_1 = /(^(?:-|[\da-zA-Z]\.) +.+\n?)+/m;
const OrderedListRule: BlockMDRule = {
  match: (text) => text.match(ORDERED_LIST_REG_1),
  html: (match, parseInline) => {
    const [listText] = match;
    const [, listStart] = listText.match(O_LIST_START) ?? [];
    const [, listType] = listText.match(O_LIST_TYPE) ?? [];

    const lines = listText
      .replace(O_LIST_TRAILING_NEWLINE, '')
      .split('\n')
      .map((lineText) => {
        const line = lineText.replace(O_LIST_ITEM_PREFIX, '');
        const txt = parseInline ? parseInline(line) : line;
        return `<li><p>${txt}</p></li>`;
      })
      .join('');

    const dataMdAtt = `data-md="${listType || listStart || ORDERED_LIST_MD_1}"`;
    const startAtt = listStart ? ` start="${listStart}"` : '';
    const typeAtt = listType ? ` type="${listType}"` : '';
    return `<ol ${dataMdAtt}${startAtt}${typeAtt}>${lines}</ol>`;
  },
};

const UNORDERED_LIST_MD_1 = '*';
const U_LIST_ITEM_PREFIX = /^\* */;
const U_LIST_TRAILING_NEWLINE = /\n$/;
const UNORDERED_LIST_REG_1 = /(^\* +.+\n?)+/m;
const UnorderedListRule: BlockMDRule = {
  match: (text) => text.match(UNORDERED_LIST_REG_1),
  html: (match, parseInline) => {
    const [listText] = match;

    const lines = listText
      .replace(U_LIST_TRAILING_NEWLINE, '')
      .split('\n')
      .map((lineText) => {
        const line = lineText.replace(U_LIST_ITEM_PREFIX, '');
        const txt = parseInline ? parseInline(line) : line;
        return `<li><p>${txt}</p></li>`;
      })
      .join('');

    return `<ul data-md="${UNORDERED_LIST_MD_1}">${lines}</ul>`;
  },
};

const runBlockRule: BlockRuleRunner = (parse, text, rule, parseInline) => {
  const matchResult = rule.match(text);
  if (matchResult) {
    const content = rule.html(matchResult, parseInline);
    return replaceMatch((txt) => [parse(txt, parseInline)], text, matchResult, content).join('');
  }
  return undefined;
};

export const parseBlockMD: BlockMDParser = (text, parseInline) => {
  if (text === '') return text;
  let result: string | undefined;

  if (!result) result = runBlockRule(parseBlockMD, text, CodeBlockRule, parseInline);
  if (!result) result = runBlockRule(parseBlockMD, text, BlockQuoteRule, parseInline);
  if (!result) result = runBlockRule(parseBlockMD, text, OrderedListRule, parseInline);
  if (!result) result = runBlockRule(parseBlockMD, text, UnorderedListRule, parseInline);
  if (!result) result = runBlockRule(parseBlockMD, text, HeadingRule, parseInline);

  // replace \n with <br/> because want to preserve empty lines
  if (!result) {
    if (parseInline) {
      result = text
        .split('\n')
        .map((lineText) => parseInline(lineText))
        .join('<br/>');
    } else {
      result = text.replace(/\n/g, '<br/>');
    }
  }

  return result ?? text;
};
