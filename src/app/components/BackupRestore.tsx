import React, { MouseEventHandler, useCallback, useState } from 'react';
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
import { InfoCard } from './info-card';
import { stopPropagation } from '../utils/keyboard';
import { bytesToSize } from '../utils/common';
import { useObservableValue } from '../hooks/useObservableValue';
import { useClient } from '../hooks/useClient';
import { AsyncStatus, useAsyncCallbackValue } from '../hooks/useAsyncCallback';

type BackupStatusProps = {
  active: boolean;
};
function BackupStatus({ active }: BackupStatusProps) {
  return (
    <Box as="span" gap="100" alignItems="Center">
      <Badge variant={active ? 'Success' : 'Critical'} fill="Solid" size="200" radii="Pill" />
      <Text
        as="span"
        size="L400"
        style={{ color: active ? color.Success.Main : color.Critical.Main }}
      >
        {active ? 'Connected' : 'Disconnected'}
      </Text>
    </Box>
  );
}

function BackupSyncing() {
  const ct = useClient();
  const [countState] = useAsyncCallbackValue(useCallback(() => ct.machine.roomKeys.count(), [ct]));

  const count = countState.status === AsyncStatus.Success ? countState.data : undefined;

  const remaining = count ? count.total - count.backedUp : undefined;

  return (
    <Box as="span" gap="100" alignItems="Center">
      <Spinner size="50" variant="Primary" fill="Soft" />
      <Text as="span" size="L400" style={{ color: color.Primary.Main }}>
        Syncing ({remaining ?? '...'})
      </Text>
    </Box>
  );
}

function BackupProgressFetching({
  receivedBytes,
  totalBytes,
}: {
  receivedBytes: number;
  totalBytes?: number;
}) {
  const receviedStr = bytesToSize(receivedBytes);
  const totalStr = totalBytes ? bytesToSize(totalBytes) : undefined;

  return (
    <Box grow="Yes" gap="200" alignItems="Center">
      <Badge variant="Secondary" fill="Solid" radii="300">
        <Text size="L400">Downloading</Text>
      </Badge>
      <Box grow="Yes" direction="Column">
        <ProgressBar
          variant="Secondary"
          size="300"
          min={0}
          max={totalBytes}
          value={receivedBytes}
        />
      </Box>
      <Badge variant="Secondary" fill="Soft" radii="Pill">
        <Text size="L400">{totalStr ? `${receivedBytes} / ${totalStr}` : receviedStr}</Text>
      </Badge>
    </Box>
  );
}

type BackupProgressProps = {
  total?: number;
  imported: number;
};
function BackupProgress({ total, imported }: BackupProgressProps) {
  return (
    <Box grow="Yes" gap="200" alignItems="Center">
      <Badge variant="Secondary" fill="Solid" radii="300">
        <Text size="L400">
          Restoring: {total ? `${Math.round(percent(0, total, imported))}%` : '0%'}
        </Text>
      </Badge>
      <Box grow="Yes" direction="Column">
        <ProgressBar variant="Secondary" size="300" min={0} max={total} value={imported} />
      </Box>
      {total && (
        <Badge variant="Secondary" fill="Soft" radii="Pill">
          <Text size="L400">
            {imported} / {total}
          </Text>
        </Badge>
      )}
    </Box>
  );
}

export function BackupRestoreTile() {
  const ct = useClient();
  const backupInfo = useObservableValue(ct.backupInfo);
  const keyBackup = useObservableValue(ct.megolmBackup.keyBackup);
  const restoreState = useObservableValue(ct.megolmBackup.restoreState);
  const backupInProgress = useObservableValue(ct.megolmBackup.backupInProgress);
  const restoring = restoreState.type === 'download' || restoreState.type === 'import';

  const [menuCords, setMenuCords] = useState<RectCords>();

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleRestore = () => {
    setMenuCords(undefined);
    if (keyBackup) {
      ct.megolmBackup.restore(keyBackup);
    }
  };

  return (
    <InfoCard
      variant="Surface"
      title="Encryption Backup"
      after={
        <Box alignItems="Center" gap="200">
          {backupInfo && (
            <>
              {backupInProgress ? <BackupSyncing /> : <BackupStatus active={!!keyBackup} />}
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
                    <Menu style={{ padding: config.space.S100 }}>
                      <Box direction="Column" gap="100">
                        <Box direction="Column" gap="200">
                          <InfoCard
                            variant="SurfaceVariant"
                            title="Backup Details"
                            description={
                              <>
                                <span>Version: {backupInfo.version}</span>
                                <br />
                                <span>Keys: {backupInfo.count}</span>
                              </>
                            }
                          />
                        </Box>
                        <Button
                          size="300"
                          variant="Success"
                          radii="300"
                          aria-disabled={!keyBackup || restoring}
                          onClick={restoring ? undefined : handleRestore}
                          before={<Icon size="100" src={Icons.Download} />}
                        >
                          <Text size="B300">Restore Backup</Text>
                        </Button>
                      </Box>
                    </Menu>
                  </FocusTrap>
                }
              />
            </>
          )}
        </Box>
      }
    >
      {!backupInfo && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>No key backup has been configured.</b>
        </Text>
      )}

      {backupInfo && !keyBackup && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>Cannot start key backup because the backup could not be verified.</b>
        </Text>
      )}
      {restoreState.type === 'download' && (
        <BackupProgressFetching
          receivedBytes={restoreState.receivedBytes}
          totalBytes={restoreState.totalBytes}
        />
      )}
      {restoreState.type === 'import' && (
        <BackupProgress
          imported={restoreState.progress?.imported ?? 0}
          total={restoreState.progress?.total}
        />
      )}
      {restoreState.type === 'error' && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{restoreState.error.data.error ?? restoreState.error.data.errcode}</b>
        </Text>
      )}
    </InfoCard>
  );
}
