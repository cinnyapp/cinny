import { Descendant, Text } from 'slate';

import { sanitizeText } from '../../utils/sanitize';
import { BlockType } from './types';
import { CustomElement } from './slate';
import { parseBlockMD, parseInlineMD } from '../../plugins/markdown';
import { findAndReplace } from '../../utils/findAndReplace';

export type OutputOptions = {
  allowTextFormatting?: boolean;
  allowInlineMarkdown?: boolean;
  allowBlockMarkdown?: boolean;
};

const textToCustomHtml = (node: Text, opts: OutputOptions): string => {
  let string = sanitizeText(node.text);
  if (opts.allowTextFormatting) {
    if (node.bold) string = `<strong>${string}</strong>`;
    if (node.italic) string = `<i>${string}</i>`;
    if (node.underline) string = `<u>${string}</u>`;
    if (node.strikeThrough) string = `<del>${string}</del>`;
    if (node.code) string = `<code>${string}</code>`;
    if (node.spoiler) string = `<span data-mx-spoiler>${string}</span>`;
  }

  if (opts.allowInlineMarkdown && string === sanitizeText(node.text)) {
    string = parseInlineMD(string);
  }

  return string;
};

const elementToCustomHtml = (node: CustomElement, children: string): string => {
  switch (node.type) {
    case BlockType.Paragraph:
      return `${children}<br/>`;
    case BlockType.Heading:
      return `<h${node.level}>${children}</h${node.level}>`;
    case BlockType.CodeLine:
      return `${children}\n`;
    case BlockType.CodeBlock:
      return `<pre><code>${children}</code></pre>`;
    case BlockType.QuoteLine:
      return `${children}<br/>`;
    case BlockType.BlockQuote:
      return `<blockquote>${children}</blockquote>`;
    case BlockType.ListItem:
      return `<li><p>${children}</p></li>`;
    case BlockType.OrderedList:
      return `<ol>${children}</ol>`;
    case BlockType.UnorderedList:
      return `<ul>${children}</ul>`;

    case BlockType.Mention: {
      let fragment = node.id;

      if (node.eventId) {
        fragment += `/${node.eventId}`;
      }
      if (node.viaServers && node.viaServers.length > 0) {
        fragment += `?${node.viaServers.map((server) => `via=${server}`).join('&')}`;
      }

      const matrixTo = `https://matrix.to/#/${fragment}`;
      return `<a href="${encodeURI(matrixTo)}">${sanitizeText(node.name)}</a>`;
    }
    case BlockType.Emoticon:
      return node.key.startsWith('mxc://')
        ? `<img data-mx-emoticon src="${node.key}" alt="${sanitizeText(
            node.shortcode
          )}" title="${sanitizeText(node.shortcode)}" height="32" />`
        : sanitizeText(node.key);
    case BlockType.Link:
      return `<a href="${encodeURI(node.href)}">${node.children}</a>`;
    case BlockType.Command:
      return `/${sanitizeText(node.command)}`;
    default:
      return children;
  }
};

const HTML_TAG_REG_G = /<([\w-]+)(?: [^>]*)?(?:(?:\/>)|(?:>.*?<\/\1>))/g;
const ignoreHTMLParseInlineMD = (text: string): string =>
  findAndReplace(
    text,
    HTML_TAG_REG_G,
    (match) => match[0],
    (txt) => parseInlineMD(txt)
  ).join('');

export const toMatrixCustomHTML = (
  node: Descendant | Descendant[],
  opts: OutputOptions
): string => {
  let markdownLines = '';
  const parseNode = (n: Descendant, index: number, targetNodes: Descendant[]) => {
    if (opts.allowBlockMarkdown && 'type' in n && n.type === BlockType.Paragraph) {
      const line = toMatrixCustomHTML(n, {
        ...opts,
        allowInlineMarkdown: false,
        allowBlockMarkdown: false,
      })
        .replace(/<br\/>$/, '\n')
        .replace(/^&gt;/, '>');
      markdownLines += line;
      if (index === targetNodes.length - 1) {
        return parseBlockMD(markdownLines, ignoreHTMLParseInlineMD);
      }
      return '';
    }

    const parsedMarkdown = parseBlockMD(markdownLines, ignoreHTMLParseInlineMD);
    markdownLines = '';
    const isCodeLine = 'type' in n && n.type === BlockType.CodeLine;
    if (isCodeLine) return `${parsedMarkdown}${toMatrixCustomHTML(n, {})}`;

    return `${parsedMarkdown}${toMatrixCustomHTML(n, { ...opts, allowBlockMarkdown: false })}`;
  };
  if (Array.isArray(node)) return node.map(parseNode).join('');
  if (Text.isText(node)) return textToCustomHtml(node, opts);

  const children = node.children.map(parseNode).join('');
  return elementToCustomHtml(node, children);
};

const elementToPlainText = (node: CustomElement, children: string): string => {
  switch (node.type) {
    case BlockType.Paragraph:
      return `${children}\n`;
    case BlockType.Heading:
      return `${children}\n`;
    case BlockType.CodeLine:
      return `${children}\n`;
    case BlockType.CodeBlock:
      return `${children}\n`;
    case BlockType.QuoteLine:
      return `| ${children}\n`;
    case BlockType.BlockQuote:
      return `${children}\n`;
    case BlockType.ListItem:
      return `- ${children}\n`;
    case BlockType.OrderedList:
      return `${children}\n`;
    case BlockType.UnorderedList:
      return `${children}\n`;
    case BlockType.Mention:
      return node.id;
    case BlockType.Emoticon:
      return node.key.startsWith('mxc://') ? `:${node.shortcode}:` : node.key;
    case BlockType.Link:
      return `[${node.children}](${node.href})`;
    case BlockType.Command:
      return `/${node.command}`;
    default:
      return children;
  }
};

export const toPlainText = (node: Descendant | Descendant[]): string => {
  if (Array.isArray(node)) return node.map((n) => toPlainText(n)).join('');
  if (Text.isText(node)) return node.text;

  const children = node.children.map((n) => toPlainText(n)).join('');
  return elementToPlainText(node, children);
};

/**
 * Check if customHtml is equals to plainText
 * by replacing `<br/>` with `/n` in customHtml
 * and sanitizing plainText before comparison
 * because text are sanitized in customHtml
 * @param customHtml string
 * @param plain string
 * @returns boolean
 */
export const customHtmlEqualsPlainText = (customHtml: string, plain: string): boolean =>
  customHtml.replace(/<br\/>/g, '\n') === sanitizeText(plain);

export const trimCustomHtml = (customHtml: string) => customHtml.replace(/<br\/>$/g, '').trim();

export const trimCommand = (cmdName: string, str: string) => {
  const cmdRegX = new RegExp(`^(\\s+)?(\\/${cmdName})([^\\S\n]+)?`);

  const match = str.match(cmdRegX);
  if (!match) return str;
  return str.slice(match[0].length);
};
