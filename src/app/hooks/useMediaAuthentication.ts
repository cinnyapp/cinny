import { useSpecVersions } from './useSpecVersions';

export const useMediaAuthentication = (): boolean => {
  const { versions } = useSpecVersions();

  // Media authentication is introduced in spec version 1.11
  const authenticatedMedia = versions.includes('v1.11');

  return authenticatedMedia;
};
