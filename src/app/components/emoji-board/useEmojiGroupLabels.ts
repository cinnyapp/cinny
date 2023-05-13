import { useMemo } from 'react';
import { EmojiGroupId } from './emoji';

export type IEmojiGroupLabels = Record<EmojiGroupId, string>;

export const useEmojiGroupLabels = (): IEmojiGroupLabels =>
  useMemo(
    () => ({
      [EmojiGroupId.People]: 'Smileys & People',
      [EmojiGroupId.Nature]: 'Animals & Nature',
      [EmojiGroupId.Food]: 'Food & Drinks',
      [EmojiGroupId.Activity]: 'Activity',
      [EmojiGroupId.Travel]: 'Travel & Places',
      [EmojiGroupId.Object]: 'Objects',
      [EmojiGroupId.Symbol]: 'Symbols',
      [EmojiGroupId.Flag]: 'Flags',
    }),
    []
  );
