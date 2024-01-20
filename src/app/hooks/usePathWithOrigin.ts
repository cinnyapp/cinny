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
