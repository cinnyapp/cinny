import { isKeyHotkey } from 'is-hotkey';
import { KeyboardEvent } from 'react';
import { Editor, Element as SlateElement, Range, Transforms } from 'slate';
import { isAnyMarkActive, isBlockActive, removeAllMark, toggleBlock, toggleMark } from './utils';
import { BlockType, MarkType } from './types';

export const INLINE_HOTKEYS: Record<string, MarkType> = {
  'mod+b': MarkType.Bold,
  'mod+i': MarkType.Italic,
  'mod+u': MarkType.Underline,
  'mod+s': MarkType.StrikeThrough,
  'mod+[': MarkType.Code,
  'mod+h': MarkType.Spoiler,
};
const INLINE_KEYS = Object.keys(INLINE_HOTKEYS);

export const BLOCK_HOTKEYS: Record<string, BlockType> = {
  'mod+7': BlockType.OrderedList,
  'mod+8': BlockType.UnorderedList,
  "mod+'": BlockType.BlockQuote,
  'mod+;': BlockType.CodeBlock,
};
const BLOCK_KEYS = Object.keys(BLOCK_HOTKEYS);
const isHeading1 = isKeyHotkey('mod+1');
const isHeading2 = isKeyHotkey('mod+2');
const isHeading3 = isKeyHotkey('mod+3');

/**
 * @return boolean true if shortcut is toggled.
 */
export const toggleKeyboardShortcut = (editor: Editor, event: KeyboardEvent<Element>): boolean => {
  if (isKeyHotkey('backspace', event) && editor.selection && Range.isCollapsed(editor.selection)) {
    const startPoint = Range.start(editor.selection);
    if (startPoint.offset !== 0) return false;

    const [parentNode, parentPath] = Editor.parent(editor, startPoint);
    const parentLocation = { at: parentPath };
    const [previousNode] = Editor.previous(editor, parentLocation) ?? [];
    const [nextNode] = Editor.next(editor, parentLocation) ?? [];

    if (Editor.isEditor(parentNode)) return false;

    if (parentNode.type === BlockType.Heading) {
      toggleBlock(editor, BlockType.Paragraph);
      return true;
    }
    if (
      parentNode.type === BlockType.CodeLine ||
      parentNode.type === BlockType.QuoteLine ||
      parentNode.type === BlockType.ListItem
    ) {
      // exit formatting only when line block
      // is first of last of it's parent
      if (!previousNode || !nextNode) {
        toggleBlock(editor, BlockType.Paragraph);
        return true;
      }
    }
    // Unwrap paragraph children to put them
    // in previous none paragraph element
    if (SlateElement.isElement(previousNode) && previousNode.type !== BlockType.Paragraph) {
      Transforms.unwrapNodes(editor, {
        at: startPoint,
      });
    }
    Editor.deleteBackward(editor);
    return true;
  }

  if (isKeyHotkey('mod+e', event) || isKeyHotkey('escape', event)) {
    if (isAnyMarkActive(editor)) {
      removeAllMark(editor);
      return true;
    }

    if (!isBlockActive(editor, BlockType.Paragraph)) {
      toggleBlock(editor, BlockType.Paragraph);
      return true;
    }
    return false;
  }

  const blockToggled = BLOCK_KEYS.find((hotkey) => {
    if (isKeyHotkey(hotkey, event)) {
      event.preventDefault();
      toggleBlock(editor, BLOCK_HOTKEYS[hotkey]);
      return true;
    }
    return false;
  });
  if (blockToggled) return true;
  if (isHeading1(event)) {
    toggleBlock(editor, BlockType.Heading, { level: 1 });
    return true;
  }
  if (isHeading2(event)) {
    toggleBlock(editor, BlockType.Heading, { level: 2 });
    return true;
  }
  if (isHeading3(event)) {
    toggleBlock(editor, BlockType.Heading, { level: 3 });
    return true;
  }

  const inlineToggled = isBlockActive(editor, BlockType.CodeBlock)
    ? false
    : INLINE_KEYS.find((hotkey) => {
        if (isKeyHotkey(hotkey, event)) {
          event.preventDefault();
          toggleMark(editor, INLINE_HOTKEYS[hotkey]);
          return true;
        }
        return false;
      });
  return !!inlineToggled;
};
