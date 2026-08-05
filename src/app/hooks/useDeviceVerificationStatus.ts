import { useCallback, useEffect, useState } from 'react';
import { useAlive } from './useAlive';
import { fulfilledPromiseSettledResult } from '../utils/common';
import { useDeviceListChange } from './useDeviceList';
import { useClient } from './useClient';

export enum VerificationStatus {
  Unknown,
  Unverified,
  Verified,
  Unsupported,
}

export const useDeviceVerificationStatus = (
  userId: string,
  deviceId: string | undefined
): VerificationStatus => {
  const [verificationStatus, setVerificationStatus] = useState(VerificationStatus.Unknown);
  const ct = useClient();

  const updateStatus = useCallback(async () => {
    if (crypto && deviceId) {
      const device = await ct.machine.userTracker.getDevice(userId, deviceId);
      if (!device) {
        setVerificationStatus(VerificationStatus.Unsupported);
        return;
      }

      setVerificationStatus(
        device.crossSigningTrusted ? VerificationStatus.Verified : VerificationStatus.Unverified
      );
      return;
    }
    setVerificationStatus(VerificationStatus.Unknown);
  }, [ct, deviceId, userId]);

  useEffect(() => {
    updateStatus();
  }, [ct, userId, updateStatus]);

  useDeviceListChange(
    useCallback(
      (userIds) => {
        if (userIds.includes(userId)) {
          updateStatus();
        }
      },
      [userId, updateStatus]
    )
  );

  return verificationStatus;
};

export const useUnverifiedDeviceCount = (userId: string, devices: string[]): number | undefined => {
  const ct = useClient();
  const [unverifiedCount, setUnverifiedCount] = useState<number>();
  const alive = useAlive();

  const updateCount = useCallback(async () => {
    let count = 0;
    if (crypto) {
      const promises = devices.map((deviceId) =>
        ct.machine.userTracker.getDevice(userId, deviceId)
      );
      const result = await Promise.allSettled(promises);
      const settledResult = fulfilledPromiseSettledResult(result);
      settledResult.forEach((device) => {
        if (device && !device.verified) {
          count += 1;
        }
      });
    }
    if (alive()) {
      setUnverifiedCount(count);
    }
  }, [ct, userId, devices, alive]);

  useDeviceListChange(
    useCallback(
      (userIds) => {
        if (userIds.includes(userId)) {
          updateCount();
        }
      },
      [userId, updateCount]
    )
  );

  useEffect(() => {
    updateCount();
  }, [updateCount]);

  return unverifiedCount;
};
