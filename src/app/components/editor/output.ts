import { Descendant, Text } from 'slate';
import { sanitizeText } from '../../utils/sanitize';
import { BlockType } from './Elements';
import { CustomElement, FormattedText } from './slate';

const textToCustomHtml = (node: FormattedText): string => {
  let string = sanitizeText(node.text);
  if (node.bold) string = `<strong>${string}</strong>`;
  if (node.italic) string = `<i>${string}</i>`;
  if (node.underline) string = `<u>${string}</u>`;
  if (node.strikeThrough) string = `<s>${string}</s>`;
  if (node.code) string = `<code>${string}</code>`;
  if (node.spoiler) string = `<span data-mx-spoiler>${string}</span>`;
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
    case BlockType.Mention:
      return `<a href="https://matrix.to/#/${node.id}">${node.name}</a>`;
    case BlockType.Emoticon:
      return node.key.startsWith('mxc://')
        ? `<img data-mx-emoticon src="${node.key}" alt="${node.shortcode}" title="${node.shortcode}" height="32">`
        : node.key;
    case BlockType.Link:
      return `<a href="${node.href}">${node.children}</a>`;
    default:
      return children;
  }
};

export const toMatrixCustomHTML = (node: Descendant | Descendant[]): string => {
  if (Array.isArray(node)) return node.map((n) => toMatrixCustomHTML(n)).join('');
  if (Text.isText(node)) return textToCustomHtml(node);

  const children = node.children.map((n) => toMatrixCustomHTML(n)).join('');
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

export const trimCustomHtml = (customHtml: string) => customHtml.replace(/<br\/>$/g, '');
