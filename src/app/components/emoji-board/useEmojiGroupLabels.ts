import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmojiGroupId } from '../../plugins/emoji';

export type IEmojiGroupLabels = Record<EmojiGroupId, string>;

export const useEmojiGroupLabels = (): IEmojiGroupLabels => {
  const { t } = useTranslation('emoji');

  return useMemo(
    () => ({
      [EmojiGroupId.People]: t('emojiGroupPeople', { defaultValue: 'Smileys & People' }),
      [EmojiGroupId.Nature]: t('emojiGroupNature', { defaultValue: 'Animals & Nature' }),
      [EmojiGroupId.Food]: t('emojiGroupFood', { defaultValue: 'Food & Drinks' }),
      [EmojiGroupId.Activity]: t('emojiGroupActivity', { defaultValue: 'Activity' }),
      [EmojiGroupId.Travel]: t('emojiGroupTravel', { defaultValue: 'Travel & Places' }),
      [EmojiGroupId.Object]: t('emojiGroupObject', { defaultValue: 'Objects' }),
      [EmojiGroupId.Symbol]: t('emojiGroupSymbol', { defaultValue: 'Symbols' }),
      [EmojiGroupId.Flag]: t('emojiGroupFlag', { defaultValue: 'Flags' }),
    }),
    [t]
  );
};
