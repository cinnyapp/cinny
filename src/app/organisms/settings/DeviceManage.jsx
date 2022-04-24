import React, { useState, useEffect } from 'react';
import './DeviceManage.scss';
import dateFormat from 'dateformat';

import initMatrix from '../../../client/initMatrix';
import { isCrossVerified } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import InfoCard from '../../atoms/card/InfoCard';
import Spinner from '../../atoms/spinner/Spinner';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';
import BinIC from '../../../../public/res/ic/outlined/bin.svg';
import InfoIC from '../../../../public/res/ic/outlined/info.svg';

import { authRequest } from './AuthRequest';

import { useStore } from '../../hooks/useStore';
import { useDeviceList } from '../../hooks/useDeviceList';
import { useCrossSigningStatus } from '../../hooks/useCrossSigningStatus';

function DeviceManage() {
  const TRUNCATED_COUNT = 4;
  const mx = initMatrix.matrixClient;
  const isCSEnabled = useCrossSigningStatus();
  const deviceList = useDeviceList();
  const [processing, setProcessing] = useState([]);
  const [truncated, setTruncated] = useState(true);
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

  const handleRemove = async (device) => {
    if (window.confirm(`You are about to logout "${device.display_name}" session.`)) {
      addToProcessing(device);
      await authRequest(`Logout "${device.display_name}"`, async (auth) => {
        await mx.deleteDevice(device.device_id, auth);
      });

      if (!mountStore.getItem()) return;
      removeFromProcessing(device);
    }
  };

  const renderDevice = (device, isVerified) => {
    const deviceId = device.device_id;
    const displayName = device.display_name;
    const lastIP = device.last_seen_ip;
    const lastTS = device.last_seen_ts;
    return (
      <SettingTile
        key={deviceId}
        title={(
          <Text style={{ color: isVerified ? '' : 'var(--tc-danger-high)' }}>
            {displayName}
            <Text variant="b3" span>{` — ${deviceId}${mx.deviceId === deviceId ? ' (current)' : ''}`}</Text>
          </Text>
        )}
        options={
          processing.includes(deviceId)
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
              {dateFormat(new Date(lastTS), ' hh:MM TT, dd/mm/yyyy')}
            </span>
            {lastIP ? ` at ${lastIP}` : ''}
          </Text>
        )}
      />
    );
  };

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
        {!isCSEnabled && (
          <div style={{ padding: 'var(--sp-extra-tight) var(--sp-normal)' }}>
            <InfoCard
              rounded
              variant="caution"
              iconSrc={InfoIC}
              title="Setup cross signing in case you lose all your sessions."
            />
          </div>
        )}
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
            ? verified.map((device, index) => {
              if (truncated && index >= TRUNCATED_COUNT) return null;
              return renderDevice(device, true);
            })
            : <Text className="device-manage__info">No verified session</Text>
        }
        { verified.length > TRUNCATED_COUNT && (
          <Button className="device-manage__info" onClick={() => setTruncated(!truncated)}>
            {truncated ? `View ${verified.length - 4} more` : 'View less'}
          </Button>
        )}
        { deviceList.length > 0 && (
          <Text className="device-manage__info" variant="b3">Session names are visible to everyone, so do not put any private info here.</Text>
        )}
      </div>
    </div>
  );
}

export default DeviceManage;
