import { InlineMDRule } from './type';

const MIN_ANY = '(.+?)';
const URL_NEG_LB = '(?<!(https?|ftp|mailto|magnet):\\/\\/\\S*)';
const ESC_NEG_LB = '(?<!\\\\)';

const BOLD_MD_1 = '**';
const BOLD_PREFIX_1 = `${ESC_NEG_LB}\\*{2}`;
const BOLD_NEG_LA_1 = '(?!\\*)';
const BOLD_REG_1 = new RegExp(
  `${URL_NEG_LB}${BOLD_PREFIX_1}${MIN_ANY}${BOLD_PREFIX_1}${BOLD_NEG_LA_1}`
);
export const BoldRule: InlineMDRule = {
  match: (text) => text.match(BOLD_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<strong data-md="${BOLD_MD_1}">${parse(g2)}</strong>`;
  },
};

const ITALIC_MD_1 = '*';
const ITALIC_PREFIX_1 = `${ESC_NEG_LB}\\*`;
const ITALIC_NEG_LA_1 = '(?!\\*)';
const ITALIC_REG_1 = new RegExp(
  `${URL_NEG_LB}${ITALIC_PREFIX_1}${MIN_ANY}${ITALIC_PREFIX_1}${ITALIC_NEG_LA_1}`
);
export const ItalicRule1: InlineMDRule = {
  match: (text) => text.match(ITALIC_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<i data-md="${ITALIC_MD_1}">${parse(g2)}</i>`;
  },
};

const ITALIC_MD_2 = '_';
const ITALIC_PREFIX_2 = `${ESC_NEG_LB}_`;
const ITALIC_NEG_LA_2 = '(?!_)';
const ITALIC_REG_2 = new RegExp(
  `${URL_NEG_LB}${ITALIC_PREFIX_2}${MIN_ANY}${ITALIC_PREFIX_2}${ITALIC_NEG_LA_2}`
);
export const ItalicRule2: InlineMDRule = {
  match: (text) => text.match(ITALIC_REG_2),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<i data-md="${ITALIC_MD_2}">${parse(g2)}</i>`;
  },
};

const UNDERLINE_MD_1 = '__';
const UNDERLINE_PREFIX_1 = `${ESC_NEG_LB}_{2}`;
const UNDERLINE_NEG_LA_1 = '(?!_)';
const UNDERLINE_REG_1 = new RegExp(
  `${URL_NEG_LB}${UNDERLINE_PREFIX_1}${MIN_ANY}${UNDERLINE_PREFIX_1}${UNDERLINE_NEG_LA_1}`
);
export const UnderlineRule: InlineMDRule = {
  match: (text) => text.match(UNDERLINE_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<u data-md="${UNDERLINE_MD_1}">${parse(g2)}</u>`;
  },
};

const STRIKE_MD_1 = '~~';
const STRIKE_PREFIX_1 = `${ESC_NEG_LB}~{2}`;
const STRIKE_NEG_LA_1 = '(?!~)';
const STRIKE_REG_1 = new RegExp(
  `${URL_NEG_LB}${STRIKE_PREFIX_1}${MIN_ANY}${STRIKE_PREFIX_1}${STRIKE_NEG_LA_1}`
);
export const StrikeRule: InlineMDRule = {
  match: (text) => text.match(STRIKE_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<s data-md="${STRIKE_MD_1}">${parse(g2)}</s>`;
  },
};

const CODE_MD_1 = '`';
const CODE_PREFIX_1 = `${ESC_NEG_LB}\``;
const CODE_NEG_LA_1 = '(?!`)';
const CODE_REG_1 = new RegExp(`${URL_NEG_LB}${CODE_PREFIX_1}(.+?)${CODE_PREFIX_1}${CODE_NEG_LA_1}`);
export const CodeRule: InlineMDRule = {
  match: (text) => text.match(CODE_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<code data-md="${CODE_MD_1}">${g2}</code>`;
  },
};

const SPOILER_MD_1 = '||';
const SPOILER_PREFIX_1 = `${ESC_NEG_LB}\\|{2}`;
const SPOILER_NEG_LA_1 = '(?!\\|)';
const SPOILER_REG_1 = new RegExp(
  `${URL_NEG_LB}${SPOILER_PREFIX_1}${MIN_ANY}${SPOILER_PREFIX_1}${SPOILER_NEG_LA_1}`
);
export const SpoilerRule: InlineMDRule = {
  match: (text) => text.match(SPOILER_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return `<span data-md="${SPOILER_MD_1}" data-mx-spoiler>${parse(g2)}</span>`;
  },
};

const LINK_ALT = `\\[${MIN_ANY}\\]`;
const LINK_URL = `\\((https?:\\/\\/.+?)\\)`;
const LINK_REG_1 = new RegExp(`${LINK_ALT}${LINK_URL}`);
export const LinkRule: InlineMDRule = {
  match: (text) => text.match(LINK_REG_1),
  html: (parse, match) => {
    const [, g1, g2] = match;
    return `<a data-md href="${g2}">${parse(g1)}</a>`;
  },
};

export const INLINE_SEQUENCE_SET = '[*_~`|\\[\\]]';
export const CAP_INLINE_SEQ = `${URL_NEG_LB}${INLINE_SEQUENCE_SET}`;
const ESC_SEQ_1 = `\\\\(${INLINE_SEQUENCE_SET})`;
const ESC_REG_1 = new RegExp(`${URL_NEG_LB}${ESC_SEQ_1}`);
export const EscapeRule: InlineMDRule = {
  match: (text) => text.match(ESC_REG_1),
  html: (parse, match) => {
    const [, , g2] = match;
    return g2;
  },
};
