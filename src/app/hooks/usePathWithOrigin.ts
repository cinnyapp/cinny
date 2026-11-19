/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useMemo } from 'react';
import { useClientConfig } from './useClientConfig';
import { trimLeadingSlash, trimSlash, trimTrailingSlash } from '../utils/common';

export const usePathWithOrigin = (path: string): string => {
  const { hashRouter } = useClientConfig();
  const { origin } = window.location;

  const pathWithOrigin = useMemo(() => {
    let url: string = trimSlash(origin);

    url += `/${trimSlash(import.meta.env.BASE_URL ?? '')}`;
    url = trimTrailingSlash(url);

    if (hashRouter?.enabled) {
      url += `/#/${trimSlash(hashRouter.basename ?? '')}`;
      url = trimTrailingSlash(url);
    }

    url += `/${trimLeadingSlash(path)}`;

    return url;
  }, [path, hashRouter, origin]);

  return pathWithOrigin;
};
