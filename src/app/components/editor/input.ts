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
import {
  escapeMarkdownInlineSequences,
  escapeMarkdownBlockSequences,
} from '../../plugins/markdown';

type ProcessTextCallback = (text: string) => string;

const getText = (node: ChildNode): string => {
  if (isText(node)) {
    return node.data;
  }
  if (isTag(node)) {
    return node.children.map((child) => getText(child)).join('');
  }
  return '';
};

const getInlineNodeMarkType = (node: Element): MarkType | undefined => {
  if (node.name === 'b' || node.name === 'strong') {
    return MarkType.Bold;
  }

  if (node.name === 'i' || node.name === 'em') {
    return MarkType.Italic;
  }

  if (node.name === 'u') {
    return MarkType.Underline;
  }

  if (node.name === 's' || node.name === 'del') {
    return MarkType.StrikeThrough;
  }

  if (node.name === 'code') {
    if (node.parent && 'name' in node.parent && node.parent.name === 'pre') {
      return undefined; // Don't apply `Code` mark inside a <pre> tag
    }
    return MarkType.Code;
  }

  if (node.name === 'span' && node.attribs['data-mx-spoiler'] !== undefined) {
    return MarkType.Spoiler;
  }

  return undefined;
};

const getInlineMarkElement = (
  markType: MarkType,
  node: Element,
  getChild: (child: ChildNode) => InlineElement[]
): InlineElement[] => {
  const children = node.children.flatMap(getChild);
  const mdSequence = node.attribs['data-md'];
  if (mdSequence !== undefined) {
    children.unshift({ text: mdSequence });
    children.push({ text: mdSequence });
    return children;
  }
  children.forEach((child) => {
    if (Text.isText(child)) {
      child[markType] = true;
    }
  });
  return children;
};

const getInlineNonMarkElement = (node: Element): MentionElement | EmoticonElement | undefined => {
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
        return createMentionElement(userMention, getText(node) || userMention, false);
      }
      const roomMention = parseMatrixToRoom(href);
      if (roomMention) {
        return createMentionElement(
          roomMention.roomIdOrAlias,
          getText(node) || roomMention.roomIdOrAlias,
          false,
          undefined,
          roomMention.viaServers
        );
      }
      const eventMention = parseMatrixToRoomEvent(href);
      if (eventMention) {
        return createMentionElement(
          eventMention.roomIdOrAlias,
          getText(node) || eventMention.roomIdOrAlias,
          false,
          eventMention.eventId,
          eventMention.viaServers
        );
      }
    }
  }
  return undefined;
};

const getInlineElement = (node: ChildNode, processText: ProcessTextCallback): InlineElement[] => {
  if (isText(node)) {
    return [{ text: processText(node.data) }];
  }

  if (isTag(node)) {
    const markType = getInlineNodeMarkType(node);
    if (markType) {
      return getInlineMarkElement(markType, node, (child) => {
        if (markType === MarkType.Code) return [{ text: getText(child) }];
        return getInlineElement(child, processText);
      });
    }

    const inlineNode = getInlineNonMarkElement(node);
    if (inlineNode) return [inlineNode];

    if (node.name === 'a') {
      const children = node.childNodes.flatMap((child) => getInlineElement(child, processText));
      children.unshift({ text: '[' });
      children.push({ text: `](${node.attribs.href})` });
      return children;
    }

    return node.childNodes.flatMap((child) => getInlineElement(child, processText));
  }

  return [];
};

const parseBlockquoteNode = (
  node: Element,
  processText: ProcessTextCallback
): BlockQuoteElement[] | ParagraphElement[] => {
  const quoteLines: Array<InlineElement[]> = [];
  let lineHolder: InlineElement[] = [];

  const appendLine = () => {
    if (lineHolder.length === 0) return;

    quoteLines.push(lineHolder);
    lineHolder = [];
  };

  node.children.forEach((child) => {
    if (isText(child)) {
      lineHolder.push({ text: processText(child.data) });
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
        quoteLines.push(child.children.flatMap((c) => getInlineElement(c, processText)));
        return;
      }

      lineHolder.push(...getInlineElement(child, processText));
    }
  });
  appendLine();

  const mdSequence = node.attribs['data-md'];
  if (mdSequence !== undefined) {
    return quoteLines.map((lineChildren) => ({
      type: BlockType.Paragraph,
      children: [{ text: `${mdSequence} ` }, ...lineChildren],
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
  const codeLines = getText(node).trim().split('\n');

  const mdSequence = node.attribs['data-md'];
  if (mdSequence !== undefined) {
    const pLines = codeLines.map<ParagraphElement>((text) => ({
      type: BlockType.Paragraph,
      children: [{ text }],
    }));
    const childCode = node.children[0];
    const attribs =
      isTag(childCode) && childCode.tagName === 'code' ? childCode.attribs : undefined;
    const languageClass = attribs?.class;
    const customLabel = attribs?.['data-label'];
    const prefix = {
      text: `${mdSequence}${customLabel ?? languageClass?.replace('language-', '') ?? ''}`,
    };
    const suffix = { text: mdSequence };
    return [
      { type: BlockType.Paragraph, children: [prefix] },
      ...pLines,
      { type: BlockType.Paragraph, children: [suffix] },
    ];
  }

  return [
    {
      type: BlockType.CodeBlock,
      children: codeLines.map<CodeLineElement>((text) => ({
        type: BlockType.CodeLine,
        children: [{ text }],
      })),
    },
  ];
};
const parseListNode = (
  node: Element,
  processText: ProcessTextCallback
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
      lineHolder.push({ text: processText(child.data) });
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
        listLines.push(child.children.flatMap((c) => getInlineElement(c, processText)));
        return;
      }

      lineHolder.push(...getInlineElement(child, processText));
    }
  });
  appendLine();

  const mdSequence = node.attribs['data-md'];
  if (mdSequence !== undefined) {
    const prefix = mdSequence || '-';
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
const parseHeadingNode = (
  node: Element,
  processText: ProcessTextCallback
): HeadingElement | ParagraphElement => {
  const children = node.children.flatMap((child) => getInlineElement(child, processText));

  const headingMatch = node.name.match(/^h([123456])$/);
  const [, g1AsLevel] = headingMatch ?? ['h3', '3'];
  const level = parseInt(g1AsLevel, 10);

  const mdSequence = node.attribs['data-md'];
  if (mdSequence !== undefined) {
    return {
      type: BlockType.Paragraph,
      children: [{ text: `${mdSequence} ` }, ...children],
    };
  }

  return {
    type: BlockType.Heading,
    level: (level <= 3 ? level : 3) as HeadingLevel,
    children,
  };
};

export const domToEditorInput = (
  domNodes: ChildNode[],
  processText: ProcessTextCallback,
  processLineStartText: ProcessTextCallback
): Descendant[] => {
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
      if (lineHolder.length === 0) {
        // we are inserting first part of line
        // it may contain block markdown starting data
        // that we may need to escape.
        lineHolder.push({ text: processLineStartText(node.data) });
        return;
      }
      lineHolder.push({ text: processText(node.data) });
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
          children: node.children.flatMap((child) => getInlineElement(child, processText)),
        });
        return;
      }

      if (node.name === 'blockquote') {
        appendLine();
        children.push(...parseBlockquoteNode(node, processText));
        return;
      }
      if (node.name === 'pre') {
        appendLine();
        children.push(...parseCodeBlockNode(node));
        return;
      }
      if (node.name === 'ol' || node.name === 'ul') {
        appendLine();
        children.push(...parseListNode(node, processText));
        return;
      }

      if (node.name.match(/^h[123456]$/)) {
        appendLine();
        children.push(parseHeadingNode(node, processText));
        return;
      }

      lineHolder.push(...getInlineElement(node, processText));
    }
  });
  appendLine();

  return children;
};

export const htmlToEditorInput = (unsafeHtml: string, markdown?: boolean): Descendant[] => {
  const sanitizedHtml = sanitizeCustomHtml(unsafeHtml);

  const processText = (partText: string) => {
    if (!markdown) return partText;
    return escapeMarkdownInlineSequences(partText);
  };

  const domNodes = parse(sanitizedHtml);
  const editorNodes = domToEditorInput(domNodes, processText, (lineStartText: string) => {
    if (!markdown) return lineStartText;
    return escapeMarkdownBlockSequences(lineStartText, processText);
  });
  return editorNodes;
};

export const plainToEditorInput = (text: string, markdown?: boolean): Descendant[] => {
  const editorNodes: Descendant[] = text.split('\n').map((lineText) => {
    const paragraphNode: ParagraphElement = {
      type: BlockType.Paragraph,
      children: [
        {
          text: markdown
            ? escapeMarkdownBlockSequences(lineText, escapeMarkdownInlineSequences)
            : lineText,
        },
      ],
    };
    return paragraphNode;
  });
  return editorNodes;
};
