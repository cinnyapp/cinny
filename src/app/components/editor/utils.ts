import { BasePoint, BaseRange, Editor, Element, Point, Range, Text, Transforms } from 'slate';
import { BlockType, MarkType } from './types';
import {
  CommandElement,
  EmoticonElement,
  FormattedText,
  HeadingLevel,
  LinkElement,
  MentionElement,
} from './slate';

const ALL_MARK_TYPE: MarkType[] = [
  MarkType.Bold,
  MarkType.Code,
  MarkType.Italic,
  MarkType.Spoiler,
  MarkType.StrikeThrough,
  MarkType.Underline,
];

export const isMarkActive = (editor: Editor, format: MarkType) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

export const isAnyMarkActive = (editor: Editor) => {
  const marks = Editor.marks(editor);
  return marks && !!ALL_MARK_TYPE.find((type) => marks[type] === true);
};

export const toggleMark = (editor: Editor, format: MarkType) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

export const removeAllMark = (editor: Editor) => {
  ALL_MARK_TYPE.forEach((mark) => {
    if (isMarkActive(editor, mark)) Editor.removeMark(editor, mark);
  });
};

export const isBlockActive = (editor: Editor, format: BlockType) => {
  const [match] = Editor.nodes(editor, {
    match: (node) => Element.isElement(node) && node.type === format,
  });

  return !!match;
};

export const headingLevel = (editor: Editor): HeadingLevel | undefined => {
  const [nodeEntry] = Editor.nodes(editor, {
    match: (node) => Element.isElement(node) && node.type === BlockType.Heading,
  });
  const [node] = nodeEntry ?? [];
  if (!node) return undefined;
  if ('level' in node) return node.level;
  return undefined;
};

type BlockOption = { level: HeadingLevel };
const NESTED_BLOCK = [
  BlockType.OrderedList,
  BlockType.UnorderedList,
  BlockType.BlockQuote,
  BlockType.CodeBlock,
];

export const toggleBlock = (editor: Editor, format: BlockType, option?: BlockOption) => {
  Transforms.collapse(editor, {
    edge: 'end',
  });
  const isActive = isBlockActive(editor, format);

  Transforms.unwrapNodes(editor, {
    match: (node) => Element.isElement(node) && NESTED_BLOCK.includes(node.type),
    split: true,
  });

  if (isActive) {
    Transforms.setNodes(editor, {
      type: BlockType.Paragraph,
    });
    return;
  }

  if (format === BlockType.OrderedList || format === BlockType.UnorderedList) {
    Transforms.setNodes(editor, {
      type: BlockType.ListItem,
    });
    const block = {
      type: format,
      children: [],
    };
    Transforms.wrapNodes(editor, block);
    return;
  }
  if (format === BlockType.CodeBlock) {
    Transforms.setNodes(editor, {
      type: BlockType.CodeLine,
    });
    const block = {
      type: format,
      children: [],
    };
    Transforms.wrapNodes(editor, block);
    return;
  }

  if (format === BlockType.BlockQuote) {
    Transforms.setNodes(editor, {
      type: BlockType.QuoteLine,
    });
    const block = {
      type: format,
      children: [],
    };
    Transforms.wrapNodes(editor, block);
    return;
  }

  if (format === BlockType.Heading) {
    Transforms.setNodes(editor, {
      type: format,
      level: option?.level ?? 1,
    });
  }

  Transforms.setNodes(editor, {
    type: format,
  });
};

export const resetEditor = (editor: Editor) => {
  Transforms.delete(editor, {
    at: {
      anchor: Editor.start(editor, []),
      focus: Editor.end(editor, []),
    },
  });

  toggleBlock(editor, BlockType.Paragraph);
  removeAllMark(editor);
};

export const resetEditorHistory = (editor: Editor) => {
  // eslint-disable-next-line no-param-reassign
  editor.history = {
    undos: [],
    redos: [],
  };
};

export const createMentionElement = (
  id: string,
  name: string,
  highlight: boolean,
  eventId?: string,
  viaServers?: string[]
): MentionElement => ({
  type: BlockType.Mention,
  id,
  eventId,
  viaServers,
  highlight,
  name,
  children: [{ text: '' }],
});

export const createEmoticonElement = (key: string, shortcode: string): EmoticonElement => ({
  type: BlockType.Emoticon,
  key,
  shortcode,
  children: [{ text: '' }],
});

export const createLinkElement = (
  href: string,
  children: string | FormattedText[]
): LinkElement => ({
  type: BlockType.Link,
  href,
  children: typeof children === 'string' ? [{ text: children }] : children,
});

export const createCommandElement = (command: string): CommandElement => ({
  type: BlockType.Command,
  command,
  children: [{ text: '' }],
});

export const replaceWithElement = (editor: Editor, selectRange: BaseRange, element: Element) => {
  Transforms.select(editor, selectRange);
  Transforms.insertNodes(editor, element);
  Transforms.collapse(editor, {
    edge: 'end',
  });
};

export const moveCursor = (editor: Editor, withSpace?: boolean) => {
  Transforms.move(editor);
  if (withSpace) editor.insertText(' ');
};

interface PointUntilCharOptions {
  match: (char: string) => boolean;
  reverse?: boolean;
}
export const getPointUntilChar = (
  editor: Editor,
  cursorPoint: BasePoint,
  options: PointUntilCharOptions
): BasePoint | undefined => {
  let targetPoint: BasePoint | undefined;
  let prevPoint: BasePoint | undefined;
  let char: string | undefined;

  const pointItr = Editor.positions(editor, {
    at: {
      anchor: Editor.start(editor, []),
      focus: Editor.point(editor, cursorPoint, { edge: 'start' }),
    },
    unit: 'character',
    reverse: options.reverse,
  });

  // eslint-disable-next-line no-restricted-syntax
  for (const point of pointItr) {
    if (!Point.equals(point, cursorPoint) && prevPoint) {
      char = Editor.string(editor, { anchor: point, focus: prevPoint });

      if (options.match(char)) break;
      targetPoint = point;
    }
    prevPoint = point;
  }
  return targetPoint;
};

export const getPrevWorldRange = (editor: Editor): BaseRange | undefined => {
  const { selection } = editor;
  if (!selection || !Range.isCollapsed(selection)) return undefined;
  const [cursorPoint] = Range.edges(selection);
  const worldStartPoint = getPointUntilChar(editor, cursorPoint, {
    reverse: true,
    match: (char) => char === ' ',
  });
  return worldStartPoint && Editor.range(editor, worldStartPoint, cursorPoint);
};

export const isEmptyEditor = (editor: Editor): boolean => {
  const firstChildren = editor.children[0];
  if (firstChildren && Element.isElement(firstChildren)) {
    const isEmpty = editor.children.length === 1 && Editor.isEmpty(editor, firstChildren);
    return isEmpty;
  }
  return false;
};

export const getBeginCommand = (editor: Editor): string | undefined => {
  const lineBlock = editor.children[0];
  if (!Element.isElement(lineBlock)) return undefined;
  if (lineBlock.type !== BlockType.Paragraph) return undefined;

  const [firstInline, secondInline] = lineBlock.children;
  const isEmptyText = Text.isText(firstInline) && firstInline.text.trim() === '';
  if (!isEmptyText) return undefined;
  if (Element.isElement(secondInline) && secondInline.type === BlockType.Command)
    return secondInline.command;
  return undefined;
};
