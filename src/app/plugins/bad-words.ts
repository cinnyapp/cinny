// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import * as badWords from 'badwords-list';
import { sanitizeForRegex } from '../utils/regex';

const additionalBadWords: string[] = ['torture', 't0rture'];

const fullBadWordList = additionalBadWords.concat(
  badWords.array.filter((word) => !additionalBadWords.includes(word))
);

export const BAD_WORDS_REGEX = new RegExp(
  `(\\b|_)(${fullBadWordList.map((word) => sanitizeForRegex(word)).join('|')})(\\b|_)`,
  'g'
);

export const testBadWords = (str: string): boolean => !!str.toLowerCase().match(BAD_WORDS_REGEX);
