/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useMemo } from 'react';
import { IconSrc, Icons } from 'folds';

import { EmojiGroupId } from '../../plugins/emoji';

export type IEmojiGroupIcons = Record<EmojiGroupId, IconSrc>;

export const useEmojiGroupIcons = (): IEmojiGroupIcons =>
  useMemo(
    () => ({
      [EmojiGroupId.People]: Icons.Smile,
      [EmojiGroupId.Nature]: Icons.Leaf,
      [EmojiGroupId.Food]: Icons.Cup,
      [EmojiGroupId.Activity]: Icons.Ball,
      [EmojiGroupId.Travel]: Icons.Photo,
      [EmojiGroupId.Object]: Icons.Bulb,
      [EmojiGroupId.Symbol]: Icons.Peace,
      [EmojiGroupId.Flag]: Icons.Flag,
    }),
    []
  );
