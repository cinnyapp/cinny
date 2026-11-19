/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useSpecVersionSupport, useUnstableFeatureSupport } from './useSpecVersions';

export const useReportRoomSupported = (): boolean => {
  const versionSupport = useSpecVersionSupport('v1.13');
  const unstableSupport = useUnstableFeatureSupport()('org.matrix.msc4151');

  // report room is introduced in spec version 1.13
  const supported = unstableSupport || versionSupport;

  return supported;
};
