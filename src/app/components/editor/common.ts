import { BasePoint, BaseRange, Editor, Element, Point, Range, Transforms } from 'slate';
import { BlockType, MarkType } from './Elements';
import { HeadingLevel } from './slate';

export const isMarkActive = (editor: Editor, format: MarkType) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

export const toggleMark = (editor: Editor, format: MarkType) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

export const isBlockActive = (editor: Editor, format: BlockType) => {
  const [match] = Editor.nodes(editor, {
    match: (node) => Element.isElement(node) && node.type === format,
  });

  return !!match;
};

type BlockOption = { level: HeadingLevel };
const NESTED_BLOCK = [
  BlockType.OrderedList,
  BlockType.UnorderedList,
  BlockType.BlockQuote,
  BlockType.CodeBlock,
];

export const toggleBlock = (editor: Editor, format: BlockType, option?: BlockOption) => {
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
};

export const insertMention = (editor: Editor, id: string, name: string, highlight: boolean) => {
  Transforms.insertNodes(editor, {
    type: BlockType.Mention,
    id,
    highlight,
    name,
    children: [{ text: '' }],
  });
  Transforms.move(editor);
};

interface PointUntilCharOptions {
  match: (char: string) => boolean;
  reverse?: boolean;
}
export const getPointUntilChar = (
  editor: Editor,
  at: BasePoint,
  options: PointUntilCharOptions
): BasePoint | undefined => {
  let targetPoint: BasePoint | undefined;
  let char: string | undefined;

  const pointItr = Editor.positions(editor, {
    at: {
      anchor: Editor.start(editor, []),
      focus: Editor.point(editor, at, { edge: 'start' }),
    },
    unit: 'character',
    reverse: options.reverse,
  });

  // eslint-disable-next-line no-restricted-syntax
  for (const point of pointItr) {
    char = Editor.string(editor, {
      anchor: point,
      focus: {
        ...point,
        offset: point.offset + 1,
      },
    });

    if (options.match(char)) break;

    if (!Point.equals(point, at)) {
      targetPoint = point;
    }
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

export const getWordPrefix = (editor: Editor, wordRange: BaseRange): string | undefined => {
  const world = Editor.string(editor, wordRange);
  return world[0] || undefined;
};
