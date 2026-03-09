import { useAutoDiscoveryInfo } from './useAutoDiscoveryInfo';

export const useLivekitSupport = (): boolean => {
  const autoDiscoveryInfo = useAutoDiscoveryInfo();

  console.log(autoDiscoveryInfo);

  const rtcFoci = autoDiscoveryInfo['org.matrix.msc4143.rtc_foci'];

  return (
    Array.isArray(rtcFoci) && rtcFoci.some((info) => typeof info.livekit_service_url === 'string')
  );
};
