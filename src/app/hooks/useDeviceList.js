/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';

import initMatrix from '../../client/initMatrix';

export function useDeviceList() {
  const mx = initMatrix.matrixClient;
  const [deviceList, setDeviceList] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const updateDevices = () => mx.getDevices().then((data) => {
      if (!isMounted) return;
      setDeviceList(data.devices || []);
    });
    updateDevices();

    const handleDevicesUpdate = (users) => {
      if (users.includes(mx.getUserId())) {
        updateDevices();
      }
    };

    mx.on('crypto.devicesUpdated', handleDevicesUpdate);
    return () => {
      mx.removeListener('crypto.devicesUpdated', handleDevicesUpdate);
      isMounted = false;
    };
  }, []);
  return deviceList;
}
