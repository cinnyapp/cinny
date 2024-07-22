import React, { useState, useEffect } from 'react';
import './DeviceManage.scss';
import dateFormat from 'dateformat';

import { isCrossVerified } from '../../../util/matrixUtil';
import { openReusableDialog, openEmojiVerification } from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Input from '../../atoms/input/Input';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import InfoCard from '../../atoms/card/InfoCard';
import Spinner from '../../atoms/spinner/Spinner';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';
import BinIC from '../../../../public/res/ic/outlined/bin.svg';
import InfoIC from '../../../../public/res/ic/outlined/info.svg';

import { authRequest } from './AuthRequest';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';

import { useStore } from '../../hooks/useStore';
import { useDeviceList } from '../../hooks/useDeviceList';
import { useCrossSigningStatus } from '../../hooks/useCrossSigningStatus';
import { accessSecretStorage } from './SecretStorageAccess';
import { useMatrixClient } from '../../hooks/useMatrixClient';

const promptDeviceName = async (deviceName) => new Promise((resolve) => {
  let isCompleted = false;

  const renderContent = (onComplete) => {
    const handleSubmit = (e) => {
      e.preventDefault();
      const name = e.target.session.value;
      if (typeof name !== 'string') onComplete(null);
      onComplete(name);
    };
    return (
      <form className="device-manage__rename" onSubmit={handleSubmit}>
        <Input value={deviceName} label="Session name" name="session" />
        <div className="device-manage__rename-btn">
          <Button variant="primary" type="submit">Save</Button>
          <Button onClick={() => onComplete(null)}>Cancel</Button>
        </div>
      </form>
    );
  };

  openReusableDialog(
    <Text variant="s1" weight="medium">Edit session name</Text>,
    (requestClose) => renderContent((name) => {
      isCompleted = true;
      resolve(name);
      requestClose();
    }),
    () => {
      if (!isCompleted) resolve(null);
    },
  );
});

function DeviceManage() {
  const TRUNCATED_COUNT = 4;
  const mx = useMatrixClient();
  const isCSEnabled = useCrossSigningStatus();
  const deviceList = useDeviceList();
  const [processing, setProcessing] = useState([]);
  const [truncated, setTruncated] = useState(true);
  const mountStore = useStore();
  mountStore.setItem(true);
  const isMeVerified = isCrossVerified(mx, mx.deviceId);

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
          <Text>Loading sessions...</Text>
        </div>
      </div>
    );
  }

  const handleRename = async (device) => {
    const newName = await promptDeviceName(device.display_name);
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
    const isConfirmed = await confirmDialog(
      `Logout ${device.display_name}`,
      `You are about to logout "${device.display_name}" session.`,
      'Logout',
      'danger',
    );
    if (!isConfirmed) return;
    addToProcessing(device);
    await authRequest(`Logout "${device.display_name}"`, async (auth) => {
      await mx.deleteDevice(device.device_id, auth);
    });

    if (!mountStore.getItem()) return;
    removeFromProcessing(device);
  };

  const verifyWithKey = async (device) => {
    const keyData = await accessSecretStorage(mx, 'Session verification');
    if (!keyData) return;
    addToProcessing(device);
    await mx.checkOwnCrossSigningTrust();
  };

  const verifyWithEmojis = async (deviceId) => {
    const req = await mx.requestVerification(mx.getUserId(), [deviceId]);
    openEmojiVerification(req, { userId: mx.getUserId(), deviceId });
  };

  const verify = (deviceId, isCurrentDevice) => {
    if (isCurrentDevice) {
      verifyWithKey(deviceId);
      return;
    }
    verifyWithEmojis(deviceId);
  };

  const renderDevice = (device, isVerified) => {
    const deviceId = device.device_id;
    const displayName = device.display_name;
    const lastIP = device.last_seen_ip;
    const lastTS = device.last_seen_ts;
    const isCurrentDevice = mx.deviceId === deviceId;
    const canVerify = isVerified === false && (isMeVerified || isCurrentDevice);

    return (
      <SettingTile
        key={deviceId}
        title={(
          <Text style={{ color: isVerified !== false ? '' : 'var(--tc-danger-high)' }}>
            {displayName}
            <Text variant="b3" span>{`${displayName ? ' — ' : ''}${deviceId}`}</Text>
            {isCurrentDevice && <Text span className="device-manage__current-label" variant="b3">Current</Text>}
          </Text>
        )}
        options={
          processing.includes(deviceId)
            ? <Spinner size="small" />
            : (
              <>
                {(isCSEnabled && canVerify) && <Button onClick={() => verify(deviceId, isCurrentDevice)} variant="positive">Verify</Button>}
                <IconButton size="small" onClick={() => handleRename(device)} src={PencilIC} tooltip="Rename" />
                <IconButton size="small" onClick={() => handleRemove(device)} src={BinIC} tooltip="Remove session" />
              </>
            )
        }
        content={(
          <>
            {lastTS && (
              <Text variant="b3">
                Last activity
                <span style={{ color: 'var(--tc-surface-normal)' }}>
                  {dateFormat(new Date(lastTS), ' hh:MM TT, dd/mm/yyyy')}
                </span>
                {lastIP ? ` at ${lastIP}` : ''}
              </Text>
            )}
            {isCurrentDevice && (
              <Text style={{ marginTop: 'var(--sp-ultra-tight)' }} variant="b3">
                {`Session Key: ${mx.getDeviceEd25519Key().match(/.{1,4}/g).join(' ')}`}
              </Text>
            )}
          </>
        )}
      />
    );
  };

  const unverified = [];
  const verified = [];
  const noEncryption = [];
  deviceList.sort((a, b) => b.last_seen_ts - a.last_seen_ts).forEach((device) => {
    const isVerified = isCrossVerified(mx, device.device_id);
    if (isVerified === true) {
      verified.push(device);
    } else if (isVerified === false) {
      unverified.push(device);
    } else {
      noEncryption.push(device);
    }
  });
  return (
    <div className="device-manage">
      <div>
        <MenuHeader>Unverified sessions</MenuHeader>
        {!isMeVerified && isCSEnabled && (
          <div style={{ padding: 'var(--sp-extra-tight) var(--sp-normal)' }}>
            <InfoCard
              rounded
              variant="primary"
              iconSrc={InfoIC}
              title="Verify this session either with your Security Key/Phrase here or by initiating emoji verification from a verified session."
            />
          </div>
        )}
        {isMeVerified && unverified.length > 0 && (
          <div style={{ padding: 'var(--sp-extra-tight) var(--sp-normal)' }}>
            <InfoCard
              rounded
              variant="surface"
              iconSrc={InfoIC}
              title="Verify other sessions by emoji verification or remove unfamiliar ones."
            />
          </div>
        )}
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
            : <Text className="device-manage__info">No unverified sessions</Text>
        }
      </div>
      {noEncryption.length > 0 && (
      <div>
        <MenuHeader>Sessions without encryption support</MenuHeader>
        {noEncryption.map((device) => renderDevice(device, null))}
      </div>
      )}
      <div>
        <MenuHeader>Verified sessions</MenuHeader>
        {
          verified.length > 0
            ? verified.map((device, index) => {
              if (truncated && index >= TRUNCATED_COUNT) return null;
              return renderDevice(device, true);
            })
            : <Text className="device-manage__info">No verified sessions</Text>
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
