import { useMemo } from 'react';
import { useClientConfig } from './useClientConfig';

const START_SLASHES_REG = /^\/+/g;
const END_SLASHES_REG = /\/+$/g;
const trimStartSlash = (str: string): string => str.replace(START_SLASHES_REG, '');
const trimEndSlash = (str: string): string => str.replace(END_SLASHES_REG, '');

const trimSlash = (str: string): string => trimStartSlash(trimEndSlash(str));

export const usePathWithOrigin = (path: string): string => {
  const clientConfig = useClientConfig();
  const basename = clientConfig.basename ?? '';
  const { origin } = window.location;

  const pathWithOrigin = useMemo(() => {
    let url: string = trimSlash(origin);

    url += `/${trimSlash(basename)}`;
    url = trimEndSlash(url);
    url += `/${trimStartSlash(path)}`;

    return url;
  }, [path, basename, origin]);

  return pathWithOrigin;
};
