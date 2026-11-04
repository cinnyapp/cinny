// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useMatch } from 'react-router-dom';
import { getCreatePath } from '../../pages/pathUtils';

export const useCreateSelected = (): boolean => {
  const match = useMatch({
    path: getCreatePath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};
