/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';
import { CryptoEvent, IMyDevice } from 'matrix-js-sdk';
import { CryptoEventHandlerMap } from 'matrix-js-sdk/lib/crypto';
import { useMatrixClient } from './useMatrixClient';

export function useDeviceList() {
  const mx = useMatrixClient();
  const [deviceList, setDeviceList] = useState<IMyDevice[] | null>(null);

  useEffect(() => {
    let isMounted = true;

    const updateDevices = () =>
      mx.getDevices().then((data) => {
        if (!isMounted) return;
        setDeviceList(data.devices || []);
      });
    updateDevices();

    const handleDevicesUpdate: CryptoEventHandlerMap[CryptoEvent.DevicesUpdated] = (users) => {
      const userId = mx.getUserId();
      if (userId && users.includes(userId)) {
        updateDevices();
      }
    };

    mx.on(CryptoEvent.DevicesUpdated, handleDevicesUpdate);
    return () => {
      mx.removeListener(CryptoEvent.DevicesUpdated, handleDevicesUpdate);
      isMounted = false;
    };
  }, [mx]);
  return deviceList;
}
