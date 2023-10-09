export type PlainMDParser = (text: string) => string;
export type MatchResult = RegExpMatchArray | RegExpExecArray;
export type RuleMatch = (text: string) => MatchResult | null;
export type MatchConverter = (parse: PlainMDParser, match: MatchResult) => string;

export type MDRule = {
  match: RuleMatch;
  html: MatchConverter;
};

export type MatchReplacer = (
  parse: PlainMDParser,
  text: string,
  match: MatchResult,
  content: string
) => string;

export type RuleRunner = (parse: PlainMDParser, text: string, rule: MDRule) => string | undefined;
export type RulesRunner = (
  parse: PlainMDParser,
  text: string,
  rules: MDRule[]
) => string | undefined;

const MIN_ANY = '(.+?)';

const BOLD_MD_1 = '**';
const BOLD_PREFIX_1 = '\\*{2}';
const BOLD_NEG_LA_1 = '(?!\\*)';
const BOLD_REG_1 = new RegExp(`${BOLD_PREFIX_1}${MIN_ANY}${BOLD_PREFIX_1}${BOLD_NEG_LA_1}`);
const BoldRule: MDRule = {
  match: (text) => text.match(BOLD_REG_1),
  html: (parse, match) => {
    const [, g1] = match;
    const child = parse(g1);
    return `<strong data-md="${BOLD_MD_1}">${child}</strong>`;
  },
};

const ITALIC_MD_1 = '*';
const ITALIC_PREFIX_1 = '\\*';
const ITALIC_NEG_LA_1 = '(?!\\*)';
const ITALIC_REG_1 = new RegExp(`${ITALIC_PREFIX_1}${MIN_ANY}${ITALIC_PREFIX_1}${ITALIC_NEG_LA_1}`);
const ItalicRule1: MDRule = {
  match: (text) => text.match(ITALIC_REG_1),
  html: (parse, match) => {
    const [, g1] = match;
    return `<i data-md="${ITALIC_MD_1}">${parse(g1)}</i>`;
  },
};

const ITALIC_MD_2 = '_';
const ITALIC_PREFIX_2 = '_';
const ITALIC_NEG_LA_2 = '(?!_)';
const ITALIC_REG_2 = new RegExp(`${ITALIC_PREFIX_2}${MIN_ANY}${ITALIC_PREFIX_2}${ITALIC_NEG_LA_2}`);
const ItalicRule2: MDRule = {
  match: (text) => text.match(ITALIC_REG_2),
  html: (parse, match) => {
    const [, g1] = match;
    return `<i data-md="${ITALIC_MD_2}">${parse(g1)}</i>`;
  },
};

const UNDERLINE_MD_1 = '__';
const UNDERLINE_PREFIX_1 = '_{2}';
const UNDERLINE_NEG_LA_1 = '(?!_)';
const UNDERLINE_REG_1 = new RegExp(
  `${UNDERLINE_PREFIX_1}${MIN_ANY}${UNDERLINE_PREFIX_1}${UNDERLINE_NEG_LA_1}`
);
const UnderlineRule: MDRule = {
  match: (text) => text.match(UNDERLINE_REG_1),
  html: (parse, match) => {
    const [, g1] = match;
    return `<u data-md="${UNDERLINE_MD_1}">${parse(g1)}</u>`;
  },
};

const STRIKE_MD_1 = '~~';
const STRIKE_PREFIX_1 = '~{2}';
const STRIKE_NEG_LA_1 = '(?!~)';
const STRIKE_REG_1 = new RegExp(`${STRIKE_PREFIX_1}${MIN_ANY}${STRIKE_PREFIX_1}${STRIKE_NEG_LA_1}`);
const StrikeRule: MDRule = {
  match: (text) => text.match(STRIKE_REG_1),
  html: (parse, match) => {
    const [, g1] = match;
    return `<s data-md="${STRIKE_MD_1}">${parse(g1)}</s>`;
  },
};

const CODE_MD_1 = '`';
const CODE_PREFIX_1 = '`';
const CODE_NEG_LA_1 = '(?!`)';
const CODE_REG_1 = new RegExp(`${CODE_PREFIX_1}${MIN_ANY}${CODE_PREFIX_1}${CODE_NEG_LA_1}`);
const CodeRule: MDRule = {
  match: (text) => text.match(CODE_REG_1),
  html: (parse, match) => {
    const [, g1] = match;
    return `<code data-md="${CODE_MD_1}">${g1}</code>`;
  },
};

const SPOILER_MD_1 = '||';
const SPOILER_PREFIX_1 = '\\|{2}';
const SPOILER_NEG_LA_1 = '(?!\\|)';
const SPOILER_REG_1 = new RegExp(
  `${SPOILER_PREFIX_1}${MIN_ANY}${SPOILER_PREFIX_1}${SPOILER_NEG_LA_1}`
);
const SpoilerRule: MDRule = {
  match: (text) => text.match(SPOILER_REG_1),
  html: (parse, match) => {
    const [, g1] = match;
    return `<span data-md="${SPOILER_MD_1}" data-mx-spoiler>${parse(g1)}</span>`;
  },
};

const LINK_ALT = `\\[${MIN_ANY}\\]`;
const LINK_URL = `\\((https?:\\/\\/.+?)\\)`;
const LINK_REG_1 = new RegExp(`${LINK_ALT}${LINK_URL}`);
const LinkRule: MDRule = {
  match: (text) => text.match(LINK_REG_1),
  html: (parse, match) => {
    const [, g1, g2] = match;
    return `<a data-md href="${g2}">${parse(g1)}</a>`;
  },
};

const beforeMatch = (text: string, match: RegExpMatchArray | RegExpExecArray): string =>
  text.slice(0, match.index);
const afterMatch = (text: string, match: RegExpMatchArray | RegExpExecArray): string =>
  text.slice((match.index ?? 0) + match[0].length);

const replaceMatch: MatchReplacer = (parse, text, match, content) =>
  `${parse(beforeMatch(text, match))}${content}${parse(afterMatch(text, match))}`;

const runRule: RuleRunner = (parse, text, rule) => {
  const matchResult = rule.match(text);
  if (matchResult) {
    const content = rule.html(parse, matchResult);
    return replaceMatch(parse, text, matchResult, content);
  }
  return undefined;
};

/**
 * Runs multiple rules at the same time to better handle nested rules.
 * Rules will be run in the order they appear.
 */
const runRules: RulesRunner = (parse, text, rules) => {
  const matchResults = rules.map((rule) => rule.match(text));

  let targetRule: MDRule | undefined;
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
    return replaceMatch(parse, text, targetResult, content);
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

export const parseInlineMD = (text: string): string => {
  let result: string | undefined;
  if (!result) result = runRule(parseInlineMD, text, CodeRule);

  if (!result) result = runRules(parseInlineMD, text, LeveledRules);

  return result ?? text;
};
