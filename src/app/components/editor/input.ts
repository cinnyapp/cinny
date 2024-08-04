/* eslint-disable no-param-reassign */
import { Descendant, Text } from 'slate';
import parse from 'html-dom-parser';
import { ChildNode, Element, isText, isTag } from 'domhandler';

import { sanitizeCustomHtml } from '../../utils/sanitize';
import { BlockType, MarkType } from './types';
import {
  BlockQuoteElement,
  CodeBlockElement,
  CodeLineElement,
  EmoticonElement,
  HeadingElement,
  HeadingLevel,
  InlineElement,
  MentionElement,
  OrderedListElement,
  ParagraphElement,
  UnorderedListElement,
} from './slate';
import { createEmoticonElement, createMentionElement } from './utils';
import {
  parseMatrixToRoom,
  parseMatrixToRoomEvent,
  parseMatrixToUser,
  testMatrixTo,
} from '../../plugins/matrix-to';
import { tryDecodeURIComponent } from '../../utils/dom';

const markNodeToType: Record<string, MarkType> = {
  b: MarkType.Bold,
  strong: MarkType.Bold,
  i: MarkType.Italic,
  em: MarkType.Italic,
  u: MarkType.Underline,
  s: MarkType.StrikeThrough,
  del: MarkType.StrikeThrough,
  code: MarkType.Code,
  span: MarkType.Spoiler,
};

const elementToTextMark = (node: Element): MarkType | undefined => {
  const markType = markNodeToType[node.name];
  if (!markType) return undefined;

  if (markType === MarkType.Spoiler && node.attribs['data-mx-spoiler'] === undefined) {
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
    return node.children.map((child) => parseNodeText(child)).join('');
  }
  return '';
};

const elementToInlineNode = (node: Element): MentionElement | EmoticonElement | undefined => {
  if (node.name === 'img' && node.attribs['data-mx-emoticon'] !== undefined) {
    const { src, alt } = node.attribs;
    if (!src) return undefined;
    return createEmoticonElement(src, alt || 'Unknown Emoji');
  }
  if (node.name === 'a') {
    const href = tryDecodeURIComponent(node.attribs.href);
    if (typeof href !== 'string') return undefined;
    if (testMatrixTo(href)) {
      const userMention = parseMatrixToUser(href);
      if (userMention) {
        return createMentionElement(userMention, parseNodeText(node) || userMention, false);
      }
      const roomMention = parseMatrixToRoom(href);
      if (roomMention) {
        return createMentionElement(
          roomMention.roomIdOrAlias,
          parseNodeText(node) || roomMention.roomIdOrAlias,
          false,
          undefined,
          roomMention.viaServers
        );
      }
      const eventMention = parseMatrixToRoomEvent(href);
      if (eventMention) {
        return createMentionElement(
          eventMention.roomIdOrAlias,
          parseNodeText(node) || eventMention.roomIdOrAlias,
          false,
          eventMention.eventId,
          eventMention.viaServers
        );
      }
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
      if (node.attribs['data-md'] !== undefined) {
        children.unshift({ text: node.attribs['data-md'] });
        children.push({ text: node.attribs['data-md'] });
      } else {
        children.forEach((child) => {
          if (Text.isText(child)) {
            child[markType] = true;
          }
        });
      }
      return children;
    }

    const inlineNode = elementToInlineNode(node);
    if (inlineNode) return [inlineNode];

    if (node.name === 'a') {
      const children = node.childNodes.flatMap(parseInlineNodes);
      children.unshift({ text: '[' });
      children.push({ text: `](${node.attribs.href})` });
      return children;
    }

    return node.childNodes.flatMap(parseInlineNodes);
  }

  return [];
};

const parseBlockquoteNode = (node: Element): BlockQuoteElement[] | ParagraphElement[] => {
  const quoteLines: Array<InlineElement[]> = [];
  let lineHolder: InlineElement[] = [];

  const appendLine = () => {
    if (lineHolder.length === 0) return;

    quoteLines.push(lineHolder);
    lineHolder = [];
  };

  node.children.forEach((child) => {
    if (isText(child)) {
      lineHolder.push({ text: child.data });
      return;
    }
    if (isTag(child)) {
      if (child.name === 'br') {
        lineHolder.push({ text: '' });
        appendLine();
        return;
      }

      if (child.name === 'p') {
        appendLine();
        quoteLines.push(child.children.flatMap((c) => parseInlineNodes(c)));
        return;
      }

      parseInlineNodes(child).forEach((inlineNode) => lineHolder.push(inlineNode));
    }
  });
  appendLine();

  if (node.attribs['data-md'] !== undefined) {
    return quoteLines.map((lineChildren) => ({
      type: BlockType.Paragraph,
      children: [{ text: `${node.attribs['data-md']} ` }, ...lineChildren],
    }));
  }

  return [
    {
      type: BlockType.BlockQuote,
      children: quoteLines.map((lineChildren) => ({
        type: BlockType.QuoteLine,
        children: lineChildren,
      })),
    },
  ];
};
const parseCodeBlockNode = (node: Element): CodeBlockElement[] | ParagraphElement[] => {
  const codeLines = parseNodeText(node).trim().split('\n');

  if (node.attribs['data-md'] !== undefined) {
    const pLines = codeLines.map<ParagraphElement>((lineText) => ({
      type: BlockType.Paragraph,
      children: [
        {
          text: lineText,
        },
      ],
    }));
    const childCode = node.children[0];
    const className =
      isTag(childCode) && childCode.tagName === 'code' ? childCode.attribs.class ?? '' : '';
    const prefix = { text: `${node.attribs['data-md']}${className.replace('language-', '')}` };
    const suffix = { text: node.attribs['data-md'] };
    return [
      { type: BlockType.Paragraph, children: [prefix] },
      ...pLines,
      { type: BlockType.Paragraph, children: [suffix] },
    ];
  }

  return [
    {
      type: BlockType.CodeBlock,
      children: codeLines.map<CodeLineElement>((lineTxt) => ({
        type: BlockType.CodeLine,
        children: [
          {
            text: lineTxt,
          },
        ],
      })),
    },
  ];
};
const parseListNode = (
  node: Element
): OrderedListElement[] | UnorderedListElement[] | ParagraphElement[] => {
  const listLines: Array<InlineElement[]> = [];
  let lineHolder: InlineElement[] = [];

  const appendLine = () => {
    if (lineHolder.length === 0) return;

    listLines.push(lineHolder);
    lineHolder = [];
  };

  node.children.forEach((child) => {
    if (isText(child)) {
      lineHolder.push({ text: child.data });
      return;
    }
    if (isTag(child)) {
      if (child.name === 'br') {
        lineHolder.push({ text: '' });
        appendLine();
        return;
      }

      if (child.name === 'li') {
        appendLine();
        listLines.push(child.children.flatMap((c) => parseInlineNodes(c)));
        return;
      }

      parseInlineNodes(child).forEach((inlineNode) => lineHolder.push(inlineNode));
    }
  });
  appendLine();

  if (node.attribs['data-md'] !== undefined) {
    const prefix = node.attribs['data-md'] || '-';
    const [starOrHyphen] = prefix.match(/^\*|-$/) ?? [];
    return listLines.map((lineChildren) => ({
      type: BlockType.Paragraph,
      children: [
        { text: `${starOrHyphen ? `${starOrHyphen} ` : `${prefix}. `} ` },
        ...lineChildren,
      ],
    }));
  }

  if (node.name === 'ol') {
    return [
      {
        type: BlockType.OrderedList,
        children: listLines.map((lineChildren) => ({
          type: BlockType.ListItem,
          children: lineChildren,
        })),
      },
    ];
  }

  return [
    {
      type: BlockType.UnorderedList,
      children: listLines.map((lineChildren) => ({
        type: BlockType.ListItem,
        children: lineChildren,
      })),
    },
  ];
};
const parseHeadingNode = (node: Element): HeadingElement | ParagraphElement => {
  const children = node.children.flatMap((child) => parseInlineNodes(child));

  const headingMatch = node.name.match(/^h([123456])$/);
  const [, g1AsLevel] = headingMatch ?? ['h3', '3'];
  const level = parseInt(g1AsLevel, 10);

  if (node.attribs['data-md'] !== undefined) {
    return {
      type: BlockType.Paragraph,
      children: [{ text: `${node.attribs['data-md']} ` }, ...children],
    };
  }

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
        lineHolder.push({ text: '' });
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
        children.push(...parseBlockquoteNode(node));
        return;
      }
      if (node.name === 'pre') {
        appendLine();
        children.push(...parseCodeBlockNode(node));
        return;
      }
      if (node.name === 'ol' || node.name === 'ul') {
        appendLine();
        children.push(...parseListNode(node));
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

export const htmlToEditorInput = (unsafeHtml: string): Descendant[] => {
  const sanitizedHtml = sanitizeCustomHtml(unsafeHtml);

  const domNodes = parse(sanitizedHtml);
  const editorNodes = domToEditorInput(domNodes);
  return editorNodes;
};

export const plainToEditorInput = (text: string): Descendant[] => {
  const editorNodes: Descendant[] = text.split('\n').map((lineText) => {
    const paragraphNode: ParagraphElement = {
      type: BlockType.Paragraph,
      children: [
        {
          text: lineText,
        },
      ],
    };
    return paragraphNode;
  });
  return editorNodes;
};
