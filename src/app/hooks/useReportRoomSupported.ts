import { useSpecVersionSupport, useUnstableFeatureSupport } from './useSpecVersions';

export const useReportRoomSupported = (): boolean => {
  const versionSupport = useSpecVersionSupport('v1.13');
  const unstableSupport = useUnstableFeatureSupport()('org.matrix.msc4151');

  // report room is introduced in spec version 1.13
  const supported = unstableSupport || versionSupport;

  return supported;
};
