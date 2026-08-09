import React, { FormEventHandler, useCallback } from 'react';
import { Box, Text, Button, Spinner, color } from 'folds';
import {
  AesHmacSha2,
  AesHmacSha2KeyDescription,
  Passphrase,
  PassphraseInfo,
  RecoveryKey,
} from 'neurone/lib/crypto/ssss';
import { PasswordInput } from './password-input';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { useAlive } from '../hooks/useAlive';

type SecretStorageRecoveryPassphraseProps = {
  processing?: boolean;
  keyDescription: AesHmacSha2KeyDescription;
  passphraseInfo: PassphraseInfo;
  onDecodedRecoveryKey: (recoveryKey: Uint8Array<ArrayBuffer>) => void;
};
export function SecretStorageRecoveryPassphrase({
  processing,
  keyDescription,
  passphraseInfo,
  onDecodedRecoveryKey,
}: SecretStorageRecoveryPassphraseProps) {
  const alive = useAlive();

  const [driveKeyState, submitPassphrase] = useAsyncCallback<
    Uint8Array<ArrayBuffer>,
    Error,
    [passphrase: string]
  >(
    useCallback(
      async (passphrase) => {
        const decodedRecoveryKey = await Passphrase.derive(passphrase, passphraseInfo);

        const { mac: regeneratedMac } = await AesHmacSha2.driveKeyMetaData(
          decodedRecoveryKey,
          keyDescription.iv
        );

        if (regeneratedMac !== keyDescription.mac) {
          throw new Error('Invalid recovery passphrase.');
        }

        return decodedRecoveryKey;
      },
      [keyDescription, passphraseInfo]
    )
  );

  const drivingKey = driveKeyState.status === AsyncStatus.Loading;
  const loading = drivingKey || processing;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    if (loading) return;
    evt.preventDefault();

    const target = evt.target as HTMLFormElement | undefined;
    const recoveryPassphraseInput = target?.recoveryPassphraseInput as HTMLInputElement | undefined;
    if (!recoveryPassphraseInput) return;
    const recoveryPassphrase = recoveryPassphraseInput.value.trim();
    if (!recoveryPassphrase) return;

    submitPassphrase(recoveryPassphrase).then((decodedRecoveryKey) => {
      if (alive()) {
        recoveryPassphraseInput.value = '';
        onDecodedRecoveryKey(decodedRecoveryKey);
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="100">
      <Box gap="200" alignItems="End">
        <Box grow="Yes" direction="Column" gap="100">
          <Text size="L400">Recovery Passphrase</Text>
          <PasswordInput
            name="recoveryPassphraseInput"
            size="400"
            variant="Secondary"
            radii="300"
            autoFocus
            required
            outlined
            readOnly={loading}
          />
        </Box>
        <Box shrink="No" gap="200">
          <Button
            type="submit"
            variant="Success"
            size="400"
            radii="300"
            disabled={loading}
            before={loading && <Spinner size="200" variant="Success" fill="Solid" />}
          >
            <Text as="span" size="B400">
              Verify
            </Text>
          </Button>
        </Box>
      </Box>
      {driveKeyState.status === AsyncStatus.Error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{driveKeyState.error.message}</b>
        </Text>
      )}
    </Box>
  );
}

type SecretStorageRecoveryKeyProps = {
  processing?: boolean;
  keyDescription: AesHmacSha2KeyDescription;
  onDecodedRecoveryKey: (recoveryKey: Uint8Array<ArrayBuffer>) => void;
};
export function SecretStorageRecoveryKey({
  processing,
  keyDescription,
  onDecodedRecoveryKey,
}: SecretStorageRecoveryKeyProps) {
  const alive = useAlive();

  const [driveKeyState, submitRecoveryKey] = useAsyncCallback<
    Uint8Array<ArrayBuffer>,
    Error,
    [string]
  >(
    useCallback(
      async (recoveryKey) => {
        const decodedRecoveryKey = RecoveryKey.decode(recoveryKey);

        const { mac: regeneratedMac } = await AesHmacSha2.driveKeyMetaData(
          decodedRecoveryKey,
          keyDescription.iv
        );

        if (regeneratedMac !== keyDescription.mac) {
          throw new Error('Invalid recovery key.');
        }

        return decodedRecoveryKey;
      },
      [keyDescription]
    )
  );

  const drivingKey = driveKeyState.status === AsyncStatus.Loading;
  const loading = drivingKey || processing;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();

    const target = evt.target as HTMLFormElement | undefined;
    const recoveryKeyInput = target?.recoveryKeyInput as HTMLInputElement | undefined;
    if (!recoveryKeyInput) return;
    const recoveryKey = recoveryKeyInput.value.trim();
    if (!recoveryKey) return;

    submitRecoveryKey(recoveryKey).then((decodedRecoveryKey) => {
      if (alive()) {
        recoveryKeyInput.value = '';
        onDecodedRecoveryKey(decodedRecoveryKey);
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="100">
      <Box gap="200" alignItems="End">
        <Box grow="Yes" direction="Column" gap="100">
          <Text size="L400">Recovery Key</Text>
          <PasswordInput
            name="recoveryKeyInput"
            size="400"
            variant="Secondary"
            radii="300"
            autoFocus
            required
            outlined
            readOnly={loading}
          />
        </Box>
        <Box shrink="No" gap="200">
          <Button
            type="submit"
            variant="Success"
            size="400"
            radii="300"
            disabled={loading}
            before={loading && <Spinner size="200" variant="Success" fill="Solid" />}
          >
            <Text as="span" size="B400">
              Verify
            </Text>
          </Button>
        </Box>
      </Box>
      {driveKeyState.status === AsyncStatus.Error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{driveKeyState.error.message}</b>
        </Text>
      )}
    </Box>
  );
}
