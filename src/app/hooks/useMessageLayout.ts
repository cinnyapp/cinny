/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useMemo } from 'react';
import { MessageLayout } from '../state/settings';

export type MessageLayoutItem = {
  name: string;
  layout: MessageLayout;
};

export const useMessageLayoutItems = (): MessageLayoutItem[] =>
  useMemo(
    () => [
      {
        layout: MessageLayout.Modern,
        name: 'Modern',
      },
      {
        layout: MessageLayout.Compact,
        name: 'Compact',
      },
      {
        layout: MessageLayout.Bubble,
        name: 'Bubble',
      },
    ],
    []
  );
