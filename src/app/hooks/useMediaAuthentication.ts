import { useSpecVersionSupport, useUnstableFeatureSupport } from './useSpecVersions';

export const useMediaAuthentication = (): boolean => {
  const versionSupport = useSpecVersionSupport('v1.11');
  const unstableSupport = useUnstableFeatureSupport()('org.matrix.msc3916.stable');

  // Media authentication is introduced in spec version 1.11
  const authenticatedMedia = unstableSupport || versionSupport;

  return authenticatedMedia;
};
