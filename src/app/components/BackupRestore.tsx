import React, { MouseEventHandler, useCallback, useState } from 'react';
import { useAtom } from 'jotai';
import { CryptoApi, KeyBackupInfo } from 'matrix-js-sdk/lib/crypto-api';
import {
  Badge,
  Box,
  Button,
  color,
  config,
  Icon,
  IconButton,
  Icons,
  Menu,
  percent,
  PopOut,
  ProgressBar,
  RectCords,
  Spinner,
  Text,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { useTranslation } from 'react-i18next';
import { BackupProgressStatus, backupRestoreProgressAtom } from '../state/backupRestore';
import { InfoCard } from './info-card';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import {
  useKeyBackupInfo,
  useKeyBackupStatus,
  useKeyBackupSync,
  useKeyBackupTrust,
} from '../hooks/useKeyBackup';
import { stopPropagation } from '../utils/keyboard';
import { useRestoreBackupOnVerification } from '../hooks/useRestoreBackupOnVerification';

type BackupStatusProps = {
  enabled: boolean;
};
function BackupStatus({ enabled }: BackupStatusProps) {
  const { t } = useTranslation('common');
  return (
    <Box as="span" gap="100" alignItems="Center">
      <Badge variant={enabled ? 'Success' : 'Critical'} fill="Solid" size="200" radii="Pill" />
      <Text
        as="span"
        size="L400"
        style={{ color: enabled ? color.Success.Main : color.Critical.Main }}
      >
        {enabled
          ? t('connected', { defaultValue: 'Connected' })
          : t('disconnected', { defaultValue: 'Disconnected' })}
      </Text>
    </Box>
  );
}
type BackupSyncingProps = {
  count: number;
};
function BackupSyncing({ count }: BackupSyncingProps) {
  const { t } = useTranslation('common');
  return (
    <Box as="span" gap="100" alignItems="Center">
      <Spinner size="50" variant="Primary" fill="Soft" />
      <Text as="span" size="L400" style={{ color: color.Primary.Main }}>
        {t('syncingCount', { defaultValue: 'Syncing ({{count}})', count })}
      </Text>
    </Box>
  );
}

function BackupProgressFetching() {
  const { t } = useTranslation('common');
  return (
    <Box grow="Yes" gap="200" alignItems="Center">
      <Badge variant="Secondary" fill="Solid" radii="300">
        <Text size="L400">{t('restoringProgress', { defaultValue: 'Restoring: {{progress}}%', progress: 0 })}</Text>
      </Badge>
      <Box grow="Yes" direction="Column">
        <ProgressBar variant="Secondary" size="300" min={0} max={1} value={0} />
      </Box>
      <Spinner size="50" variant="Secondary" fill="Soft" />
    </Box>
  );
}

type BackupProgressProps = {
  total: number;
  downloaded: number;
};
function BackupProgress({ total, downloaded }: BackupProgressProps) {
  const { t } = useTranslation('common');
  return (
    <Box grow="Yes" gap="200" alignItems="Center">
      <Badge variant="Secondary" fill="Solid" radii="300">
        <Text size="L400">
          {t('restoringProgress', {
            defaultValue: 'Restoring: {{progress}}%',
            progress: Math.round(percent(0, total, downloaded)),
          })}
        </Text>
      </Badge>
      <Box grow="Yes" direction="Column">
        <ProgressBar variant="Secondary" size="300" min={0} max={total} value={downloaded} />
      </Box>
      <Badge variant="Secondary" fill="Soft" radii="Pill">
        <Text size="L400">
          {downloaded} / {total}
        </Text>
      </Badge>
    </Box>
  );
}

type BackupTrustInfoProps = {
  crypto: CryptoApi;
  backupInfo: KeyBackupInfo;
};
function BackupTrustInfo({ crypto, backupInfo }: BackupTrustInfoProps) {
  const { t } = useTranslation('common');
  const trust = useKeyBackupTrust(crypto, backupInfo);

  if (!trust) return null;

  return (
    <Box direction="Column">
      {trust.matchesDecryptionKey ? (
        <Text size="T200" style={{ color: color.Success.Main }}>
          <b>{t('backupHasTrustedDecryptionKey', { defaultValue: 'Backup has trusted decryption key.' })}</b>
        </Text>
      ) : (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>
            {t('backupNoTrustedDecryptionKey', {
              defaultValue: 'Backup does not have trusted decryption key!',
            })}
          </b>
        </Text>
      )}
      {trust.trusted ? (
        <Text size="T200" style={{ color: color.Success.Main }}>
          <b>{t('backupTrustedBySignature', { defaultValue: 'Backup has trusted by signature.' })}</b>
        </Text>
      ) : (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>
            {t('backupNoTrustedSignature', { defaultValue: 'Backup does not have trusted signature!' })}
          </b>
        </Text>
      )}
    </Box>
  );
}

type BackupRestoreTileProps = {
  crypto: CryptoApi;
};
export function BackupRestoreTile({ crypto }: BackupRestoreTileProps) {
  const { t } = useTranslation('common');
  const [restoreProgress, setRestoreProgress] = useAtom(backupRestoreProgressAtom);
  const restoring =
    restoreProgress.status === BackupProgressStatus.Fetching ||
    restoreProgress.status === BackupProgressStatus.Loading;

  const backupEnabled = useKeyBackupStatus(crypto);
  const backupInfo = useKeyBackupInfo(crypto);
  const [remainingSession, syncFailure] = useKeyBackupSync();

  const [menuCords, setMenuCords] = useState<RectCords>();

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const [restoreState, restoreBackup] = useAsyncCallback<void, Error, []>(
    useCallback(async () => {
      await crypto.restoreKeyBackup({
        progressCallback(progress) {
          setRestoreProgress(progress);
        },
      });
    }, [crypto, setRestoreProgress])
  );

  const handleRestore = () => {
    setMenuCords(undefined);
    restoreBackup();
  };

  return (
    <InfoCard
      variant="Surface"
      title={t('encryptionBackup', { defaultValue: 'Encryption Backup' })}
      after={
        <Box alignItems="Center" gap="200">
          {remainingSession === 0 ? (
            <BackupStatus enabled={backupEnabled} />
          ) : (
            <BackupSyncing count={remainingSession} />
          )}
          <IconButton
            aria-pressed={!!menuCords}
            size="300"
            variant="Surface"
            radii="300"
            onClick={handleMenu}
          >
            <Icon size="100" src={Icons.VerticalDots} />
          </IconButton>
          <PopOut
            anchor={menuCords}
            offset={5}
            position="Bottom"
            align="End"
            content={
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setMenuCords(undefined),
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) =>
                    evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
                  isKeyBackward: (evt: KeyboardEvent) =>
                    evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Menu
                  style={{
                    padding: config.space.S100,
                  }}
                >
                  <Box direction="Column" gap="100">
                    <Box direction="Column" gap="200">
                      <InfoCard
                        variant="SurfaceVariant"
                        title={t('backupDetails', { defaultValue: 'Backup Details' })}
                        description={
                          <>
                            <span>
                              {t('versionWithValue', {
                                defaultValue: 'Version: {{value}}',
                                value: backupInfo?.version ?? 'NIL',
                              })}
                            </span>
                            <br />
                            <span>
                              {t('keysWithValue', {
                                defaultValue: 'Keys: {{value}}',
                                value: backupInfo?.count ?? 'NIL',
                              })}
                            </span>
                          </>
                        }
                      />
                    </Box>
                    <Button
                      size="300"
                      variant="Success"
                      radii="300"
                      aria-disabled={restoreState.status === AsyncStatus.Loading || restoring}
                      onClick={
                        restoreState.status === AsyncStatus.Loading || restoring
                          ? undefined
                          : handleRestore
                      }
                      before={<Icon size="100" src={Icons.Download} />}
                    >
                      <Text size="B300">{t('restoreBackup', { defaultValue: 'Restore Backup' })}</Text>
                    </Button>
                  </Box>
                </Menu>
              </FocusTrap>
            }
          />
        </Box>
      }
    >
      {syncFailure && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{syncFailure}</b>
        </Text>
      )}
      {!backupEnabled && backupInfo === null && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{t('noBackupOnServer', { defaultValue: 'No backup present on server!' })}</b>
        </Text>
      )}
      {!syncFailure && !backupEnabled && backupInfo && (
        <BackupTrustInfo crypto={crypto} backupInfo={backupInfo} />
      )}
      {restoreState.status === AsyncStatus.Loading && !restoring && <BackupProgressFetching />}
      {restoreProgress.status === BackupProgressStatus.Fetching && <BackupProgressFetching />}
      {restoreProgress.status === BackupProgressStatus.Loading && (
        <BackupProgress
          total={restoreProgress.data.total}
          downloaded={restoreProgress.data.downloaded}
        />
      )}
      {restoreState.status === AsyncStatus.Error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{restoreState.error.message}</b>
        </Text>
      )}
    </InfoCard>
  );
}

export function AutoRestoreBackupOnVerification() {
  useRestoreBackupOnVerification();

  return null;
}
