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
