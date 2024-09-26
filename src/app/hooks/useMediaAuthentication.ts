import { useSpecVersions } from './useSpecVersions';

export const useMediaAuthentication = (): boolean => {
  const { versions, unstable_features: unstableFeatures } = useSpecVersions();

  // Media authentication is introduced in spec version 1.11
  const authenticatedMedia =
    unstableFeatures?.['org.matrix.msc3916.stable'] || versions.includes('v1.11');

  return authenticatedMedia;
};
