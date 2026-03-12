import { AutoDiscoveryInfo } from '../cs-api';
import { useAutoDiscoveryInfo } from './useAutoDiscoveryInfo';

export const livekitSupport = (autoDiscoveryInfo: AutoDiscoveryInfo): boolean => {
  const rtcFoci = autoDiscoveryInfo['org.matrix.msc4143.rtc_foci'];

  return (
    Array.isArray(rtcFoci) && rtcFoci.some((info) => typeof info.livekit_service_url === 'string')
  );
};

export const useLivekitSupport = (): boolean => {
  const autoDiscoveryInfo = useAutoDiscoveryInfo();

  return livekitSupport(autoDiscoveryInfo);
};
