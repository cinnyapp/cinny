import { BlockMDRule } from './type';

const HEADING_REG_1 = /^(#{1,6}) +(.+)\n?/m;
export const HeadingRule: BlockMDRule = {
  match: (text) => text.match(HEADING_REG_1),
  html: (match, parseInline) => {
    const [, g1, g2] = match;
    const level = g1.length;
    return `<h${level} data-md="${g1}">${parseInline ? parseInline(g2) : g2}</h${level}>`;
  },
};

const CODEBLOCK_MD_1 = '```';
const CODEBLOCK_REG_1 = /^`{3}(\S*)\n((?:.*\n)+?)`{3} *(?!.)\n?/m;
export const CodeBlockRule: BlockMDRule = {
  match: (text) => text.match(CODEBLOCK_REG_1),
  html: (match) => {
    const [, g1, g2] = match;
    // use last identifier after dot, e.g. for "example.json" gets us "json" as language code.
    const langCode = g1 ? g1.substring(g1.lastIndexOf('.') + 1) : null;
    const filename = g1 != langCode ? g1 : null;
    const classNameAtt = langCode ? ` class="language-${langCode}"` : '';
    const filenameAtt = filename ? ` data-label="${filename}"` : '';
    return `<pre data-md="${CODEBLOCK_MD_1}"><code${classNameAtt}${filenameAtt}>${g2}</code></pre>`;
  },
};

const BLOCKQUOTE_MD_1 = '>';
const QUOTE_LINE_PREFIX = /^> */;
const BLOCKQUOTE_TRAILING_NEWLINE = /\n$/;
const BLOCKQUOTE_REG_1 = /(^>.*\n?)+/m;
export const BlockQuoteRule: BlockMDRule = {
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
export const OrderedListRule: BlockMDRule = {
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
export const UnorderedListRule: BlockMDRule = {
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

export const UN_ESC_BLOCK_SEQ = /^\\*(#{1,6} +|```|>|(-|[\da-zA-Z]\.) +|\* +)/;
export const ESC_BLOCK_SEQ = /^\\(\\*(#{1,6} +|```|>|(-|[\da-zA-Z]\.) +|\* +))/;
