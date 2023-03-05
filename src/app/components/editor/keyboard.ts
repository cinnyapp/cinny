import { isHotkey } from 'is-hotkey';
import { KeyboardEvent } from 'react';
import { Editor } from 'slate';
import { isBlockActive, toggleBlock, toggleMark } from './common';
import { BlockType, MarkType } from './Elements';

export const INLINE_HOTKEYS: Record<string, MarkType> = {
  'ctrl+b': MarkType.Bold,
  'mod+b': MarkType.Bold,
  'ctrl+i': MarkType.Italic,
  'mod+i': MarkType.Italic,
  'ctrl+u': MarkType.Underline,
  'mod+u': MarkType.Underline,
  'ctrl+shift+u': MarkType.StrikeThrough,
  'mod+shift+u': MarkType.StrikeThrough,
  'ctrl+[': MarkType.Code,
  'mod+[': MarkType.Code,
};
const INLINE_KEYS = Object.keys(INLINE_HOTKEYS);

export const BLOCK_HOTKEYS: Record<string, BlockType> = {
  'ctrl+shift+0': BlockType.OrderedList,
  'mod+shift+0': BlockType.OrderedList,
  'ctrl+shift+8': BlockType.UnorderedList,
  'mod+shift+8': BlockType.UnorderedList,
  'ctrl+shift+.': BlockType.BlockQuote,
  'mod+shift+.': BlockType.BlockQuote,
  'ctrl+shift+m': BlockType.CodeBlock,
  'mod+shift+m': BlockType.CodeBlock,
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
