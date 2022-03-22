import React, { useState, useEffect } from 'react';
import './DeviceManage.scss';
import dateFormat from 'dateformat';

import initMatrix from '../../../client/initMatrix';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import Spinner from '../../atoms/spinner/Spinner';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';
import BinIC from '../../../../public/res/ic/outlined/bin.svg';

import { useStore } from '../../hooks/useStore';

function useDeviceList() {
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

function isCrossVerified(deviceId) {
  try {
    const mx = initMatrix.matrixClient;
    const crossSignInfo = mx.getStoredCrossSigningForUser(mx.getUserId());
    const deviceInfo = mx.getStoredDevice(mx.getUserId(), deviceId);
    const deviceTrust = crossSignInfo.checkDeviceTrust(crossSignInfo, deviceInfo, false, true);
    return deviceTrust.isCrossSigningVerified();
  } catch {
    return false;
  }
}

function DeviceManage() {
  const mx = initMatrix.matrixClient;
  const deviceList = useDeviceList();
  const [processing, setProcessing] = useState([]);
  const mountStore = useStore();
  mountStore.setItem(true);
  useEffect(() => {
    setProcessing([]);
  }, [deviceList]);

  const addToProcessing = (device) => {
    const old = [...processing];
    old.push(device.device_id);
    setProcessing(old);
  };

  const removeFromProcessing = () => {
    setProcessing([]);
  };

  if (deviceList === null) {
    return (
      <div className="device-manage">
        <div className="device-manage__loading">
          <Spinner size="small" />
          <Text>Loading devices...</Text>
        </div>
      </div>
    );
  }

  const handleRename = async (device) => {
    const newName = window.prompt('Edit session name', device.display_name);
    if (newName === null || newName.trim() === '') return;
    if (newName.trim() === device.display_name) return;
    addToProcessing(device);
    try {
      await mx.setDeviceDetails(device.device_id, {
        display_name: newName,
      });
    } catch {
      if (!mountStore.getItem()) return;
      removeFromProcessing(device);
    }
  };

  const handleRemove = async (device, auth = undefined) => {
    if (confirm(`You are about to logout "${device.display_name}" session?`)) {
      addToProcessing(device, auth);
      try {
        await mx.deleteDevice(device.device_id);
      } catch (e) {
        if (!mountStore.getItem()) return;
        removeFromProcessing(device);
      }
    }
  };

  const renderDevice = (device, isVerified) => (
    <SettingTile
      key={device.device_id}
      title={(
        <Text style={{ color: isVerified ? '' : 'var(--tc-danger-high)' }}>
          {device.display_name}
          <Text variant="b3" span>{` — ${device.device_id}${mx.deviceId === device.device_id ? ' (current)' : ''}`}</Text>
        </Text>
      )}
      options={
        processing.includes(device.device_id)
          ? <Spinner size="small" />
          : (
            <>
              <IconButton size="small" onClick={() => handleRename(device)} src={PencilIC} tooltip="Rename" />
              <IconButton size="small" onClick={() => handleRemove(device)} src={BinIC} tooltip="Remove session" />
            </>
          )
      }
      content={(
        <Text variant="b3">
          Last activity
          <span style={{ color: 'var(--tc-surface-normal)' }}>
            {dateFormat(new Date(device.last_seen_ts), ' hh:MM TT, dd/mm/yyyy')}
          </span>
          {` at ${device.last_seen_ip}`}
        </Text>
      )}
    />
  );

  const unverified = [];
  const verified = [];
  deviceList.sort((a, b) => b.last_seen_ts - a.last_seen_ts).forEach((device) => {
    if (isCrossVerified(device.device_id)) verified.push(device);
    else unverified.push(device);
  });
  return (
    <div className="device-manage">
      <div>
        <MenuHeader>Unverified sessions</MenuHeader>
        {
          unverified.length > 0
            ? unverified.map((device) => renderDevice(device, false))
            : <Text className="device-manage__info">No unverified session</Text>
        }
      </div>
      <div>
        <MenuHeader>Verified sessions</MenuHeader>
        {
          verified.length > 0
            ? verified.map((device) => renderDevice(device, true))
            : <Text className="device-manage__info">No verified session</Text>
        }
      </div>
    </div>
  );
}

export default DeviceManage;
