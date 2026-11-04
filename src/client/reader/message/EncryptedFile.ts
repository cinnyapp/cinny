/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { ObjectReader } from 'neurone/lib/utils';

export class rEncryptedFile {
  static url(encFile?: object): string | undefined {
    return ObjectReader.string(encFile, 'url');
  }
}
