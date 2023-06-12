import { CompactEmoji } from 'emojibase';
import emojisData from 'emojibase-data/en/compact.json';
import joypixels from 'emojibase-data/en/shortcodes/joypixels.json';
import emojibase from 'emojibase-data/en/shortcodes/emojibase.json';

export type IEmoji = CompactEmoji & {
  shortcode: string;
};

export enum EmojiGroupId {
  People = 'People',
  Nature = 'Nature',
  Food = 'Food',
  Activity = 'Activity',
  Travel = 'Travel',
  Object = 'Object',
  Symbol = 'Symbol',
  Flag = 'Flag',
}

export type IEmojiGroup = {
  id: EmojiGroupId;
  order: number;
  emojis: IEmoji[];
};

export const emojiGroups: IEmojiGroup[] = [
  {
    id: EmojiGroupId.People,
    order: 0,
    emojis: [],
  },
  {
    id: EmojiGroupId.Nature,
    order: 1,
    emojis: [],
  },
  {
    id: EmojiGroupId.Food,
    order: 2,
    emojis: [],
  },
  {
    id: EmojiGroupId.Activity,
    order: 3,
    emojis: [],
  },
  {
    id: EmojiGroupId.Travel,
    order: 4,
    emojis: [],
  },
  {
    id: EmojiGroupId.Object,
    order: 5,
    emojis: [],
  },
  {
    id: EmojiGroupId.Symbol,
    order: 6,
    emojis: [],
  },
  {
    id: EmojiGroupId.Flag,
    order: 7,
    emojis: [],
  },
];

export const emojis: IEmoji[] = [];

function addEmojiToGroup(groupIndex: number, emoji: IEmoji) {
  emojiGroups[groupIndex].emojis.push(emoji);
}

function getGroupIndex(emoji: IEmoji): number | undefined {
  if (emoji.group === 0 || emoji.group === 1) return 0;
  if (emoji.group === 3) return 1;
  if (emoji.group === 4) return 2;
  if (emoji.group === 6) return 3;
  if (emoji.group === 5) return 4;
  if (emoji.group === 7) return 5;
  if (emoji.group === 8 || typeof emoji.group === 'undefined') return 6;
  if (emoji.group === 9) return 7;
  return undefined;
}

emojisData.forEach((emoji) => {
  const myShortCodes = joypixels[emoji.hexcode] || emojibase[emoji.hexcode];
  if (!myShortCodes) return;
  if (Array.isArray(myShortCodes) && myShortCodes.length === 0) return;

  const em: IEmoji = {
    ...emoji,
    shortcode: Array.isArray(myShortCodes) ? myShortCodes[0] : myShortCodes,
    shortcodes: Array.isArray(myShortCodes) ? myShortCodes : emoji.shortcodes,
  };

  const groupIndex = getGroupIndex(em);
  if (groupIndex !== undefined) {
    addEmojiToGroup(groupIndex, em);
    emojis.push(em);
  }
});
