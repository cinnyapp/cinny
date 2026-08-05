import React from 'react';
import { Box, Text, IconButton, Icon, Icons, Scroll } from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useDeviceIds, useDeviceList, useSplitCurrentDevice } from '../../../hooks/useDeviceList';
import { LocalBackup } from './LocalBackup';
import { DeviceLogoutBtn, DeviceKeyDetails, DeviceTile, DeviceTilePlaceholder } from './DeviceTile';
import {
  DeviceVerificationOptions,
  EnableVerification,
  VerificationStatusBadge,
  VerifyCurrentDeviceTile,
} from './Verification';
import {
  useDeviceVerificationStatus,
  useUnverifiedDeviceCount,
  VerificationStatus,
} from '../../../hooks/useDeviceVerificationStatus';
import {
  useSecretStorageDefaultKeyId,
  useSecretStorageKeyContent,
} from '../../../hooks/useSecretStorage';
import { useCrossSigning } from '../../../hooks/useCrossSigning';
import { BackupRestoreTile } from '../../../components/BackupRestore';
import { useClient } from '../../../hooks/useClient';
import { OtherDevices } from './OtherDevices';
import { useObservableValue } from '../../../hooks/useObservableValue';

function DevicesPlaceholder() {
  return (
    <Box direction="Column" gap="100">
      <DeviceTilePlaceholder />
      <DeviceTilePlaceholder />
    </Box>
  );
}

type DevicesProps = {
  requestClose: () => void;
};
export function Devices({ requestClose }: DevicesProps) {
  const ct = useClient();
  const crossSigning = useCrossSigning();
  const keyBackup = useObservableValue(ct.megolmBackup.keyBackup);

  const [devices, refreshDeviceList] = useDeviceList();

  const [currentDevice, otherDevices] = useSplitCurrentDevice(devices);
  const verificationStatus = useDeviceVerificationStatus(
    ct.session.userId,
    currentDevice?.device_id
  );

  const otherDevicesId = useDeviceIds(otherDevices);
  const unverifiedDeviceCount = useUnverifiedDeviceCount(ct.session.userId, otherDevicesId);

  const defaultSecretStorageKeyId = useSecretStorageDefaultKeyId();
  const defaultSecretStorageKeyContent = useSecretStorageKeyContent(
    defaultSecretStorageKeyId ?? ''
  );

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Devices
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <Box direction="Column" gap="100">
                <Text size="L400">Security</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title="Device Verification"
                    description="To verify device identity and grant access to encrypted messages."
                    after={
                      crossSigning ? (
                        <Box gap="200" alignItems="Center">
                          <VerificationStatusBadge
                            verificationStatus={verificationStatus}
                            otherUnverifiedCount={unverifiedDeviceCount}
                          />
                          <DeviceVerificationOptions />
                        </Box>
                      ) : (
                        <EnableVerification />
                      )
                    }
                  />
                </SequenceCard>
              </Box>
              <Box direction="Column" gap="100">
                <Text size="L400">Current</Text>
                {currentDevice ? (
                  <SequenceCard
                    className={SequenceCardStyle}
                    variant="SurfaceVariant"
                    direction="Column"
                    gap="400"
                  >
                    <DeviceTile
                      device={currentDevice}
                      refreshDeviceList={refreshDeviceList}
                      options={<DeviceLogoutBtn />}
                    >
                      <DeviceKeyDetails />
                    </DeviceTile>
                    {crossSigning &&
                      verificationStatus === VerificationStatus.Unverified &&
                      defaultSecretStorageKeyId &&
                      defaultSecretStorageKeyContent && (
                        <VerifyCurrentDeviceTile
                          secretStorageKeyId={defaultSecretStorageKeyId}
                          secretStorageKeyContent={defaultSecretStorageKeyContent}
                        />
                      )}
                    {keyBackup && <BackupRestoreTile />}
                  </SequenceCard>
                ) : (
                  <DeviceTilePlaceholder />
                )}
              </Box>
              {devices === undefined && <DevicesPlaceholder />}
              {otherDevices && (
                <OtherDevices
                  devices={otherDevices}
                  refreshDeviceList={refreshDeviceList}
                  showVerification={
                    crossSigning && verificationStatus === VerificationStatus.Verified
                  }
                />
              )}
              <LocalBackup />
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
