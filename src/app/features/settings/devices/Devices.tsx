import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Text, IconButton, Icon, Icons, Scroll } from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useDeviceIds, useDeviceList, useSplitCurrentDevice } from '../../../hooks/useDeviceList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { LocalBackup } from './LocalBackup';
import { DeviceLogoutBtn, DeviceKeyDetails, DeviceTile, DeviceTilePlaceholder } from './DeviceTile';
import { OtherDevices } from './OtherDevices';
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
import { useCrossSigningActive } from '../../../hooks/useCrossSigning';
import { BackupRestoreTile } from '../../../components/BackupRestore';

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
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const crypto = mx.getCrypto();
  const crossSigningActive = useCrossSigningActive();
  const [devices, refreshDeviceList] = useDeviceList();

  const [currentDevice, otherDevices] = useSplitCurrentDevice(devices);
  const verificationStatus = useDeviceVerificationStatus(
    crypto,
    mx.getSafeUserId(),
    currentDevice?.device_id
  );

  const otherDevicesId = useDeviceIds(otherDevices);
  const unverifiedDeviceCount = useUnverifiedDeviceCount(
    crypto,
    mx.getSafeUserId(),
    otherDevicesId
  );

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
              {t('settings.devices')}
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
                <Text size="L400">{t('settings.deviceSettings.security')}</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title={t('settings.deviceSettings.deviceVerification')}
                    description={t('settings.deviceSettings.deviceVerificationDesc')}
                    after={
                      <>
                        <EnableVerification visible={!crossSigningActive} />
                        {crossSigningActive && (
                          <Box gap="200" alignItems="Center">
                            <VerificationStatusBadge
                              verificationStatus={verificationStatus}
                              otherUnverifiedCount={unverifiedDeviceCount}
                            />
                            <DeviceVerificationOptions />
                          </Box>
                        )}
                      </>
                    }
                  />
                </SequenceCard>
              </Box>
              <Box direction="Column" gap="100">
                <Text size="L400">{t('settings.deviceSettings.current')}</Text>
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
                      {crypto && <DeviceKeyDetails crypto={crypto} />}
                    </DeviceTile>
                    {crossSigningActive &&
                      verificationStatus === VerificationStatus.Unverified &&
                      defaultSecretStorageKeyId &&
                      defaultSecretStorageKeyContent && (
                        <VerifyCurrentDeviceTile
                          secretStorageKeyId={defaultSecretStorageKeyId}
                          secretStorageKeyContent={defaultSecretStorageKeyContent}
                        />
                      )}
                    {crypto && verificationStatus === VerificationStatus.Verified && (
                      <BackupRestoreTile crypto={crypto} />
                    )}
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
                    crossSigningActive && verificationStatus === VerificationStatus.Verified
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
