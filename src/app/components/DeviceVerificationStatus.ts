/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { ReactNode } from 'react';
import {
  useDeviceVerificationStatus,
  VerificationStatus,
} from '../hooks/useDeviceVerificationStatus';

type DeviceVerificationStatusProps = {
  userId: string;
  deviceId: string;
  children: (verificationStatus: VerificationStatus) => ReactNode;
};

export function DeviceVerificationStatus({
  userId,
  deviceId,
  children,
}: DeviceVerificationStatusProps) {
  const status = useDeviceVerificationStatus(userId, deviceId);

  return children(status);
}
