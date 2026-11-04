// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useMatch, useParams } from 'react-router-dom';
import { getExploreFeaturedPath, getExplorePath } from '../../pages/pathUtils';

export const useExploreSelected = (): boolean => {
  const match = useMatch({
    path: getExplorePath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useExploreFeaturedSelected = (): boolean => {
  const match = useMatch({
    path: getExploreFeaturedPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useExploreServer = (): string | undefined => {
  const { server } = useParams();

  return server;
};
