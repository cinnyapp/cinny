import { useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Device } from 'neurone/lib/api/types';
import { getDevices, GetDevicesOK } from 'neurone/lib/api/matrix/client/v3/devices';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { useClient } from './useClient';

export const useDeviceListChange = (onChange: (users: string[]) => void) => {
  const ct = useClient();

  useEffect(() => ct.machine.events.onDevicesUpdated.subscribe(onChange), [ct, onChange]);
};

const DEVICES_QUERY_KEY = ['devices'];

export function useDeviceList(): [undefined | Device[], () => Promise<void>] {
  const ct = useClient();

  const fetchDevices = useCallback(async () => {
    const resp = await ct.requestAuthJSON(getDevices({}));
    const [err, result] = await parseMatrixResp<GetDevicesOK>(resp);

    if (err) console.error('Error loading devices!', err);

    return result?.devices ?? [];
  }, [ct]);

  const { data: deviceList, refetch } = useQuery({
    queryKey: DEVICES_QUERY_KEY,
    queryFn: fetchDevices,
    staleTime: 0,
    gcTime: Infinity,
    refetchOnMount: 'always',
  });

  const refreshDeviceList = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useDeviceListChange(
    useCallback(
      (users) => {
        const { userId } = ct.session;
        if (userId && users.includes(userId)) {
          refreshDeviceList();
        }
      },
      [ct, refreshDeviceList]
    )
  );

  return [deviceList ?? undefined, refreshDeviceList];
}

export const useDeviceIds = (devices: Device[] | undefined): string[] => {
  const devicesId = useMemo(() => devices?.map((device) => device.device_id) ?? [], [devices]);

  return devicesId;
};

export const useSplitCurrentDevice = (
  devices: Device[] | undefined
): [Device | undefined, Device[] | undefined] => {
  const ct = useClient();
  const currentDeviceId = ct.session.deviceId;

  const currentDevice = useMemo(
    () => devices?.find((d) => d.device_id === currentDeviceId),
    [devices, currentDeviceId]
  );
  const otherDevices = useMemo(
    () => devices?.filter((device) => device.device_id !== currentDeviceId),
    [devices, currentDeviceId]
  );

  return [currentDevice, otherDevices];
};
