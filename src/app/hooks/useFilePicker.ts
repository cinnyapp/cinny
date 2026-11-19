/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback } from 'react';
import { selectFile } from '../utils/dom';

export const useFilePicker = <M extends boolean | undefined = undefined>(
  onSelect: (file: M extends true ? File[] : File) => void,
  multiple?: M
) =>
  useCallback(
    async (accept: string) => {
      const file = await selectFile(accept, multiple);
      if (!file) return;
      onSelect(file);
    },
    [multiple, onSelect]
  );
