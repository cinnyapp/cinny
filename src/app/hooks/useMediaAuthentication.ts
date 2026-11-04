/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useSpecVersionSupport, useUnstableFeatureSupport } from './useSpecVersions';

export const useMediaAuthentication = (): boolean => {
  const versionSupport = useSpecVersionSupport('v1.11');
  const unstableSupport = useUnstableFeatureSupport()('org.matrix.msc3916.stable');

  // Media authentication is introduced in spec version 1.11
  const authenticatedMedia = unstableSupport || versionSupport;

  return authenticatedMedia;
};
