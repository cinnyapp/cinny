import { Text } from 'slate';
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
  return string;
};

const elementToCustomHtml = (node: CustomElement, children: string): string => {
  switch (node.type) {
    case BlockType.Paragraph:
      return `<p>${children}</p>`;
    case BlockType.Heading:
      return `<h${node.level}>${children}</h${node.level}>`;
    case BlockType.CodeLine:
      return `${children}\n`;
    case BlockType.CodeBlock:
      return `<pre><code>${children}</code></pre>`;
    case BlockType.QuoteLine:
      return `<p>${children}</p>`;
    case BlockType.BlockQuote:
      return `<blockquote>${children}</blockquote>`;
    case BlockType.ListItem:
      return `<li><p>${children}</p></li>`;
    case BlockType.OrderedList:
      return `<ol>${children}</ol>`;
    case BlockType.UnorderedList:
      return `<ul>${children}</ul>`;
    default:
      return children;
  }
};

export const toMatrixCustomHTML = (node: CustomElement | Text): string => {
  if (Text.isText(node)) return textToCustomHtml(node);

  const children = node.children.map((n) => toMatrixCustomHTML(n)).join('');
  return elementToCustomHtml(node, children);
};

const elementToPlainText = (node: CustomElement, children: string): string => {
  switch (node.type) {
    case BlockType.Paragraph:
      return `${children}\n\n`;
    case BlockType.Heading:
      return `${children}\n\n`;
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
    default:
      return children;
  }
};

export const toPlainText = (node: CustomElement | Text): string => {
  if (Text.isText(node)) return sanitizeText(node.text);

  const children = node.children.map((n) => toPlainText(n)).join('');
  return elementToPlainText(node, children);
};
