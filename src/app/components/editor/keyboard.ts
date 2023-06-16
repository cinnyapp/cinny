import { isHotkey } from 'is-hotkey';
import { KeyboardEvent } from 'react';
import { Editor } from 'slate';
import { isAnyMarkActive, isBlockActive, removeAllMark, toggleBlock, toggleMark } from './common';
import { BlockType, MarkType } from './Elements';

export const INLINE_HOTKEYS: Record<string, MarkType> = {
  'mod+b': MarkType.Bold,
  'mod+i': MarkType.Italic,
  'mod+u': MarkType.Underline,
  'mod+shift+u': MarkType.StrikeThrough,
  'mod+[': MarkType.Code,
  'mod+h': MarkType.Spoiler,
};
const INLINE_KEYS = Object.keys(INLINE_HOTKEYS);

export const BLOCK_HOTKEYS: Record<string, BlockType> = {
  'mod+shift+7': BlockType.OrderedList,
  'mod+shift+8': BlockType.UnorderedList,
  "mod+shift+'": BlockType.BlockQuote,
  'mod+shift+;': BlockType.CodeBlock,
};
const BLOCK_KEYS = Object.keys(BLOCK_HOTKEYS);

/**
 * @return boolean true if shortcut is toggled.
 */
export const toggleKeyboardShortcut = (editor: Editor, event: KeyboardEvent<Element>): boolean => {
  if (isHotkey('mod+e', event)) {
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
    if (isHotkey(hotkey, event)) {
      event.preventDefault();
      toggleBlock(editor, BLOCK_HOTKEYS[hotkey]);
      return true;
    }
    return false;
  });
  if (blockToggled) return true;

  const inlineToggled = isBlockActive(editor, BlockType.CodeBlock)
    ? false
    : INLINE_KEYS.find((hotkey) => {
        if (isHotkey(hotkey, event)) {
          event.preventDefault();
          toggleMark(editor, INLINE_HOTKEYS[hotkey]);
          return true;
        }
        return false;
      });
  return !!inlineToggled;
};
