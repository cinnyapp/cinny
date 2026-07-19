import React from 'react';
import { Box } from 'folds';
import { EmojiItemInfo, EmojiType } from '../types';
import * as css from './styles.css';
import { PackImageReader } from '../../../plugins/custom-emoji';
import { IEmoji } from '../../../plugins/emoji';

export const getEmojiItemInfo = (element: Element): EmojiItemInfo | undefined => {
  const label = element.getAttribute('title');
  const type = element.getAttribute('data-emoji-type') as EmojiType | undefined;
  const data = element.getAttribute('data-emoji-data');
  const shortcode = element.getAttribute('data-emoji-shortcode');

  if (type && data && shortcode && label)
    return {
      type,
      data,
      shortcode,
      label,
    };
  return undefined;
};

type EmojiItemProps = {
  emoji: IEmoji;
};
export function EmojiItem({ emoji }: EmojiItemProps) {
  return (
    <Box
      as="button"
      type="button"
      alignItems="Center"
      justifyContent="Center"
      className={css.EmojiItem}
      title={emoji.label}
      aria-label={`${emoji.label} emoji`}
      data-emoji-type={EmojiType.Emoji}
      data-emoji-data={emoji.unicode}
      data-emoji-shortcode={emoji.shortcode}
    >
      {emoji.unicode}
    </Box>
  );
}

type CustomEmojiItemProps = {
  url?: string;
  image: PackImageReader;
};
export function CustomEmojiItem({ url, image }: CustomEmojiItemProps) {
  return (
    <Box
      as="button"
      type="button"
      alignItems="Center"
      justifyContent="Center"
      className={css.EmojiItem}
      title={image.body || image.shortcode}
      aria-label={`${image.body || image.shortcode} emoji`}
      data-emoji-type={EmojiType.CustomEmoji}
      data-emoji-data={image.url}
      data-emoji-shortcode={image.shortcode}
    >
      <img
        loading="lazy"
        className={css.CustomEmojiImg}
        alt={image.body || image.shortcode}
        src={url ?? image.url}
      />
    </Box>
  );
}

type StickerItemProps = {
  url?: string;
  image: PackImageReader;
};

export function StickerItem({ url, image }: StickerItemProps) {
  return (
    <Box
      as="button"
      type="button"
      alignItems="Center"
      justifyContent="Center"
      className={css.StickerItem}
      title={image.body || image.shortcode}
      aria-label={`${image.body || image.shortcode} emoji`}
      data-emoji-type={EmojiType.Sticker}
      data-emoji-data={image.url}
      data-emoji-shortcode={image.shortcode}
    >
      <img
        loading="lazy"
        className={css.StickerImg}
        alt={image.body || image.shortcode}
        src={url ?? image.url}
      />
    </Box>
  );
}
