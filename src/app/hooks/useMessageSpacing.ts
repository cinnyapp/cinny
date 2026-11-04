/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useMemo } from 'react';
import { MessageSpacing } from '../state/settings';

export type MessageSpacingItem = {
  name: string;
  spacing: MessageSpacing;
};

export const useMessageSpacingItems = (): MessageSpacingItem[] =>
  useMemo(
    () => [
      {
        spacing: '0',
        name: 'None',
      },
      {
        spacing: '100',
        name: 'Ultra Small',
      },
      {
        spacing: '200',
        name: 'Extra Small',
      },
      {
        spacing: '300',
        name: 'Small',
      },
      {
        spacing: '400',
        name: 'Normal',
      },
      {
        spacing: '500',
        name: 'Large',
      },
    ],
    []
  );
