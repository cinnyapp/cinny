import { isHotkey } from 'is-hotkey';
import { KeyboardEvent } from 'react';
import { Editor } from 'slate';
import { isBlockActive, toggleBlock, toggleMark } from './common';
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
  'mod+shift+0': BlockType.OrderedList,
  'mod+shift+8': BlockType.UnorderedList,
  "mod+shift+'": BlockType.BlockQuote,
  'mod+shift+;': BlockType.CodeBlock,
};
const BLOCK_KEYS = Object.keys(BLOCK_HOTKEYS);

export const toggleKeyboardShortcut = (editor: Editor, event: KeyboardEvent<Element>) => {
  BLOCK_KEYS.forEach((hotkey) => {
    if (isHotkey(hotkey, event)) {
      event.preventDefault();
      toggleBlock(editor, BLOCK_HOTKEYS[hotkey]);
    }
  });

  if (!isBlockActive(editor, BlockType.CodeBlock))
    INLINE_KEYS.forEach((hotkey) => {
      if (isHotkey(hotkey, event)) {
        event.preventDefault();
        toggleMark(editor, INLINE_HOTKEYS[hotkey]);
      }
    });
};
