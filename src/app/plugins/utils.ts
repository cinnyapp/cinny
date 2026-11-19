/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { SearchItemStrGetter } from '../hooks/useAsyncSearch';
import { PackImageReader } from './custom-emoji';
import { IEmoji } from './emoji';

export const getEmoticonSearchStr: SearchItemStrGetter<PackImageReader | IEmoji> = (item) => {
  const shortcode = `:${item.shortcode}:`;
  if (item instanceof PackImageReader) {
    if (item.body) {
      return [shortcode, item.body];
    }
    return shortcode;
  }

  const names = [shortcode, item.label];
  if (Array.isArray(item.shortcodes)) {
    return names.concat(item.shortcodes);
  }
  return names;
};
