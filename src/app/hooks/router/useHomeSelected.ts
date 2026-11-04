// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useMatch } from 'react-router-dom';
import {
  getHomeCreatePath,
  getHomeJoinPath,
  getHomePath,
  getHomeSearchPath,
} from '../../pages/pathUtils';

export const useHomeSelected = (): boolean => {
  const homeMatch = useMatch({
    path: getHomePath(),
    caseSensitive: true,
    end: false,
  });

  return !!homeMatch;
};

export const useHomeCreateSelected = (): boolean => {
  const match = useMatch({
    path: getHomeCreatePath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useHomeJoinSelected = (): boolean => {
  const match = useMatch({
    path: getHomeJoinPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useHomeSearchSelected = (): boolean => {
  const match = useMatch({
    path: getHomeSearchPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};
