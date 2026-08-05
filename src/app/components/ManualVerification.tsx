import React, { MouseEventHandler, ReactNode, useCallback, useState } from 'react';
import {
  Box,
  Text,
  Chip,
  Icon,
  Icons,
  RectCords,
  PopOut,
  Menu,
  config,
  MenuItem,
  color,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { AesHmacSha2, AesHmacSha2KeyDescription } from 'neurone/lib/crypto/ssss';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { stopPropagation } from '../utils/keyboard';
import { SettingTile } from './setting-tile';
import { SecretStorageRecoveryKey, SecretStorageRecoveryPassphrase } from './SecretStorage';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { useClient } from '../hooks/useClient';
import { getCrossSigningPrivateKeys, useCrossSigningSecretData } from '../hooks/useCrossSigning';
import { AccountDataType } from '../../types/matrix/accountData';

export enum ManualVerificationMethod {
  RecoveryPassphrase = 'passphrase',
  RecoveryKey = 'key',
}
type ManualVerificationMethodSwitcherProps = {
  value: ManualVerificationMethod;
  onChange: (value: ManualVerificationMethod) => void;
};
export function ManualVerificationMethodSwitcher({
  value,
  onChange,
}: ManualVerificationMethodSwitcherProps) {
  const [menuCords, setMenuCords] = useState<RectCords>();

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleSelect = (method: ManualVerificationMethod) => {
    setMenuCords(undefined);
    onChange(method);
  };

  return (
    <>
      <Chip
        type="button"
        variant="Secondary"
        fill="Soft"
        radii="Pill"
        before={<Icon size="100" src={Icons.ChevronBottom} />}
        onClick={handleMenu}
      >
        <Text as="span" size="B300">
          {value === ManualVerificationMethod.RecoveryPassphrase && 'Recovery Passphrase'}
          {value === ManualVerificationMethod.RecoveryKey && 'Recovery Key'}
        </Text>
      </Chip>
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
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <MenuItem
                  size="300"
                  variant="Surface"
                  aria-selected={value === ManualVerificationMethod.RecoveryPassphrase}
                  radii="300"
                  onClick={() => handleSelect(ManualVerificationMethod.RecoveryPassphrase)}
                >
                  <Box grow="Yes">
                    <Text size="T300">Recovery Passphrase</Text>
                  </Box>
                </MenuItem>
                <MenuItem
                  size="300"
                  variant="Surface"
                  aria-selected={value === ManualVerificationMethod.RecoveryKey}
                  radii="300"
                  onClick={() => handleSelect(ManualVerificationMethod.RecoveryKey)}
                >
                  <Box grow="Yes">
                    <Text size="T300">Recovery Key</Text>
                  </Box>
                </MenuItem>
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </>
  );
}

type ManualVerificationTileProps = {
  secretStorageKeyId: string;
  secretStorageKeyContent: AesHmacSha2KeyDescription;
  options?: ReactNode;
};
export function ManualVerificationTile({
  secretStorageKeyId,
  secretStorageKeyContent,
  options,
}: ManualVerificationTileProps) {
  const ct = useClient();
  const csSecretData = useCrossSigningSecretData(secretStorageKeyId);

  const hasPassphrase = !!secretStorageKeyContent.passphrase;
  const [method, setMethod] = useState(
    hasPassphrase
      ? ManualVerificationMethod.RecoveryPassphrase
      : ManualVerificationMethod.RecoveryKey
  );

  const verifyAndRestoreBackup = useCallback(
    async (recoveryKey: Uint8Array<ArrayBuffer>) => {
      const status = await ct.machine.crossSigning.getStatus();
      const machineHasKeys = status.master && status.self && status.user;

      if (!machineHasKeys && csSecretData) {
        const crossSigningKeys = await getCrossSigningPrivateKeys(recoveryKey, csSecretData);

        const s = await ct.machine.crossSigning.importKeys(crossSigningKeys);
        if (!s.master || !s.self || !s.user) {
          throw new Error('Failed to import to CrossSigningSecrets keys!');
        }
      }

      const { userId, deviceId } = ct.session;
      const device = await ct.machine.userTracker.getDevice(userId, deviceId);
      if (device && !device.crossSigningTrusted) {
        const resp = await device.verify();
        const [err] = await parseMatrixResp(resp);
        if (err) {
          throw new Error(err.data.error ?? 'Failed to verify. Signature upload request failed.');
        }

        // device.verify uploads signatures to mark device as verifed
        // query keys to receive signs now instead of update via /sync
        // if we don't do that device remains unverified until next sync device_list change
        await ct.machine.outgoingRequests.queryKeys([ct.session.userId]);
      }

      const backupKeyEncryptedData = ct.secrets.megolmBackup.read?.get(secretStorageKeyId);
      if (!backupKeyEncryptedData) {
        return;
      }
      const backupKey = await AesHmacSha2.decrypt(
        recoveryKey,
        AccountDataType.MegolmBackupV1,
        backupKeyEncryptedData
      );
      await ct.megolmBackup.saveDecryptionKey(backupKey);
    },
    [ct, secretStorageKeyId, csSecretData]
  );

  const [verifyState, handleDecodedRecoveryKey] = useAsyncCallback<
    void,
    Error,
    [Uint8Array<ArrayBuffer>]
  >(verifyAndRestoreBackup);
  const verifying = verifyState.status === AsyncStatus.Loading;

  return (
    <Box direction="Column" gap="200">
      <SettingTile
        title="Verify Manually"
        description={hasPassphrase ? 'Select a verification method.' : 'Provide recovery key.'}
        after={
          <Box alignItems="Center" gap="200">
            {hasPassphrase && (
              <ManualVerificationMethodSwitcher value={method} onChange={setMethod} />
            )}
            {options}
          </Box>
        }
      />
      {verifyState.status === AsyncStatus.Success ? (
        <Text size="T200" style={{ color: color.Success.Main }}>
          <b>Device verified!</b>
        </Text>
      ) : (
        <Box direction="Column" gap="100">
          {method === ManualVerificationMethod.RecoveryKey && (
            <SecretStorageRecoveryKey
              processing={verifying}
              keyDescription={secretStorageKeyContent}
              onDecodedRecoveryKey={handleDecodedRecoveryKey}
            />
          )}
          {method === ManualVerificationMethod.RecoveryPassphrase &&
            secretStorageKeyContent.passphrase && (
              <SecretStorageRecoveryPassphrase
                processing={verifying}
                keyDescription={secretStorageKeyContent}
                passphraseInfo={secretStorageKeyContent.passphrase}
                onDecodedRecoveryKey={handleDecodedRecoveryKey}
              />
            )}
          {verifyState.status === AsyncStatus.Error && (
            <Text size="T200" style={{ color: color.Critical.Main }}>
              <b>{verifyState.error.message}</b>
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
