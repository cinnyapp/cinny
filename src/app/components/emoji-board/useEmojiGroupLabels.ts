import { useMemo } from 'react';
import { EmojiGroupId } from './emoji';

export type IEmojiGroupLabels = Record<EmojiGroupId, string>;

export const useEmojiGroupLabels = (): IEmojiGroupLabels =>
  useMemo(
    () => ({
      [EmojiGroupId.People]: 'Smileys & people',
      [EmojiGroupId.Nature]: 'Animals & nature',
      [EmojiGroupId.Food]: 'Food & drinks',
      [EmojiGroupId.Activity]: 'Activity',
      [EmojiGroupId.Travel]: 'Travel & places',
      [EmojiGroupId.Object]: 'Objects',
      [EmojiGroupId.Symbol]: 'Symbols',
      [EmojiGroupId.Flag]: 'Flags',
    }),
    []
  );
