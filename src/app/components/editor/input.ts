/* eslint-disable no-param-reassign */
import { Descendant, Text } from 'slate';
import parse from 'html-dom-parser';
import { ChildNode, Element, isText, isTag } from 'domhandler';

import { sanitizeCustomHtml } from '../../utils/sanitize';
import { BlockType, MarkType } from './Elements';
import {
  BlockQuoteElement,
  CodeBlockElement,
  CodeLineElement,
  EmoticonElement,
  HeadingElement,
  HeadingLevel,
  InlineElement,
  ListItemElement,
  MentionElement,
  OrderedListElement,
  QuoteLineElement,
  UnorderedListElement,
} from './slate';
import { parseMatrixToUrl } from '../../utils/matrix';
import { createEmoticonElement, createMentionElement } from './common';

const markNodeToType: Record<string, MarkType> = {
  b: MarkType.Bold,
  strong: MarkType.Bold,
  i: MarkType.Italic,
  u: MarkType.Underline,
  s: MarkType.StrikeThrough,
  code: MarkType.Code,
  span: MarkType.Spoiler,
};

const elementToTextMark = (node: Element): MarkType | undefined => {
  const markType = markNodeToType[node.name];
  if (!markType) return undefined;

  if (markType === MarkType.Spoiler && !node.attribs['data-mx-spoiler']) {
    return undefined;
  }
  if (
    markType === MarkType.Code &&
    node.parent &&
    'name' in node.parent &&
    node.parent.name === 'pre'
  ) {
    return undefined;
  }
  return markType;
};

const parseNodeText = (node: ChildNode): string => {
  if (isText(node)) {
    return node.data;
  }
  if (isTag(node)) {
    node.children.map((child) => parseNodeText(child)).join('');
  }
  return '';
};

const elementToInlineNode = (node: Element): MentionElement | EmoticonElement | undefined => {
  if (node.name === 'img' && node.attribs['data-mx-emoticon']) {
    const { href, alt } = node.attribs;
    if (!href) return undefined;
    return createEmoticonElement(href, alt || 'Unknown Emoji');
  }
  if (node.name === 'a') {
    const { href } = node.attribs;
    if (typeof href !== 'string') return undefined;
    const [mxId] = parseMatrixToUrl(href);
    if (mxId) {
      return createMentionElement(mxId, mxId, false);
    }
  }
  return undefined;
};

const parseInlineNodes = (node: ChildNode): InlineElement[] => {
  if (isText(node)) {
    return [{ text: node.data }];
  }
  if (isTag(node)) {
    const markType = elementToTextMark(node);
    if (markType) {
      const children = node.children.flatMap(parseInlineNodes);
      children.forEach((child) => {
        if (Text.isText(child)) {
          child[markType] = true;
        }
      });
      return children;
    }

    const inlineNode = elementToInlineNode(node);
    if (inlineNode) return [inlineNode];

    if (node.name === 'a') {
      return node.childNodes.flatMap(parseInlineNodes);
    }

    return node.childNodes.flatMap(parseInlineNodes);
  }

  return [];
};

const parseBlockquoteNode = (node: Element): BlockQuoteElement => {
  const children: QuoteLineElement[] = [];
  let lineHolder: InlineElement[] = [];

  const appendLine = () => {
    if (lineHolder.length === 0) return;

    children.push({
      type: BlockType.QuoteLine,
      children: lineHolder,
    });
    lineHolder = [];
  };

  node.children.forEach((child) => {
    if (isText(child)) {
      lineHolder.push({ text: child.data });
      return;
    }
    if (isTag(child)) {
      if (child.name === 'br') {
        appendLine();
        return;
      }

      if (child.name === 'p') {
        appendLine();
        children.push({
          type: BlockType.QuoteLine,
          children: child.children.flatMap((c) => parseInlineNodes(c)),
        });
        return;
      }

      parseInlineNodes(child).forEach((inlineNode) => lineHolder.push(inlineNode));
    }
  });
  appendLine();

  return {
    type: BlockType.BlockQuote,
    children,
  };
};
const parseCodeBlockNode = (node: Element): CodeBlockElement => {
  const children: CodeLineElement[] = [];

  const code = parseNodeText(node);
  code.split('\n').forEach((lineTxt) =>
    children.push({
      type: BlockType.CodeLine,
      children: [
        {
          text: lineTxt,
        },
      ],
    })
  );

  return {
    type: BlockType.CodeBlock,
    children,
  };
};
const parseListNode = (node: Element): OrderedListElement | UnorderedListElement => {
  const children: ListItemElement[] = [];
  let lineHolder: InlineElement[] = [];

  const appendLine = () => {
    if (lineHolder.length === 0) return;

    children.push({
      type: BlockType.ListItem,
      children: lineHolder,
    });
    lineHolder = [];
  };

  node.children.forEach((child) => {
    if (isText(child)) {
      lineHolder.push({ text: child.data });
      return;
    }
    if (isTag(child)) {
      if (child.name === 'br') {
        appendLine();
        return;
      }

      if (child.name === 'li') {
        appendLine();
        children.push({
          type: BlockType.ListItem,
          children: child.children.flatMap((c) => parseInlineNodes(c)),
        });
        return;
      }

      parseInlineNodes(child).forEach((inlineNode) => lineHolder.push(inlineNode));
    }
  });
  appendLine();

  return {
    type: node.name === 'ol' ? BlockType.OrderedList : BlockType.UnorderedList,
    children,
  };
};
const parseHeadingNode = (node: Element): HeadingElement => {
  const children = node.children.flatMap((child) => parseInlineNodes(child));

  const headingMatch = node.name.match(/^h([123456])$/);
  const [, g1AsLevel] = headingMatch ?? ['h3', '3'];
  const level = parseInt(g1AsLevel, 10);
  return {
    type: BlockType.Heading,
    level: (level <= 3 ? level : 3) as HeadingLevel,
    children,
  };
};

export const domToEditorInput = (domNodes: ChildNode[]): Descendant[] => {
  const children: Descendant[] = [];

  let lineHolder: InlineElement[] = [];

  const appendLine = () => {
    if (lineHolder.length === 0) return;

    children.push({
      type: BlockType.Paragraph,
      children: lineHolder,
    });
    lineHolder = [];
  };

  domNodes.forEach((node) => {
    if (isText(node)) {
      lineHolder.push({ text: node.data });
      return;
    }
    if (isTag(node)) {
      if (node.name === 'br') {
        appendLine();
        return;
      }

      if (node.name === 'p') {
        appendLine();
        children.push({
          type: BlockType.Paragraph,
          children: node.children.flatMap((child) => parseInlineNodes(child)),
        });
        return;
      }

      if (node.name === 'blockquote') {
        appendLine();
        children.push(parseBlockquoteNode(node));
        return;
      }
      if (node.name === 'pre') {
        appendLine();
        children.push(parseCodeBlockNode(node));
        return;
      }
      if (node.name === 'ol' || node.name === 'ul') {
        appendLine();
        children.push(parseListNode(node));
        return;
      }

      if (node.name.match(/^h[123456]$/)) {
        appendLine();
        children.push(parseHeadingNode(node));
        return;
      }

      parseInlineNodes(node).forEach((inlineNode) => lineHolder.push(inlineNode));
    }
  });
  appendLine();

  return children;
};

export const htmlToEditorInput = (unsafeHtml: string) => {
  const sanitizedHtml = sanitizeCustomHtml(unsafeHtml);

  const domNodes = parse(sanitizedHtml);
  const editorNodes = domToEditorInput(domNodes);
  return editorNodes;
};

export const plainToHtmlInput = (text: string) => {
  const editorNodes = text.split('\n').map((line) => ({
    type: BlockType.Paragraph,
    text: line,
  }));
  return editorNodes;
};
