/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

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
