import React, { FormEventHandler, useCallback } from 'react';
import { Box, Text, Button, Spinner, color } from 'folds';
import { decodeRecoveryKey, deriveRecoveryKeyFromPassphrase } from 'matrix-js-sdk/lib/crypto-api';
import { useTranslation } from 'react-i18next';
import { PasswordInput } from './password-input';
import {
  SecretStorageKeyContent,
  SecretStoragePassphraseContent,
} from '../../types/matrix/accountData';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { useAlive } from '../hooks/useAlive';

type SecretStorageRecoveryPassphraseProps = {
  processing?: boolean;
  keyContent: SecretStorageKeyContent;
  passphraseContent: SecretStoragePassphraseContent;
  onDecodedRecoveryKey: (recoveryKey: Uint8Array) => void;
};
export function SecretStorageRecoveryPassphrase({
  processing,
  keyContent,
  passphraseContent,
  onDecodedRecoveryKey,
}: SecretStorageRecoveryPassphraseProps) {
  const { t } = useTranslation('common');
  const mx = useMatrixClient();
  const alive = useAlive();

  const [driveKeyState, submitPassphrase] = useAsyncCallback<
    Uint8Array,
    Error,
    Parameters<typeof deriveRecoveryKeyFromPassphrase>
  >(
    useCallback(
      async (passphrase, salt, iterations, bits) => {
        const decodedRecoveryKey = await deriveRecoveryKeyFromPassphrase(
          passphrase,
          salt,
          iterations,
          bits
        );

        const match = await mx.secretStorage.checkKey(decodedRecoveryKey, keyContent as any);

        if (!match) {
          throw new Error(
            t('invalidRecoveryPassphrase', { defaultValue: 'Invalid recovery passphrase.' })
          );
        }

        return decodedRecoveryKey;
      },
      [mx, keyContent, t]
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

    const { salt, iterations, bits } = passphraseContent;
    submitPassphrase(recoveryPassphrase, salt, iterations, bits).then((decodedRecoveryKey) => {
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
          <Text size="L400">
            {t('recoveryPassphrase', { defaultValue: 'Recovery Passphrase' })}
          </Text>
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
              {t('verify', { defaultValue: 'Verify' })}
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
  keyContent: SecretStorageKeyContent;
  onDecodedRecoveryKey: (recoveryKey: Uint8Array) => void;
};
export function SecretStorageRecoveryKey({
  processing,
  keyContent,
  onDecodedRecoveryKey,
}: SecretStorageRecoveryKeyProps) {
  const { t } = useTranslation('common');
  const mx = useMatrixClient();
  const alive = useAlive();

  const [driveKeyState, submitRecoveryKey] = useAsyncCallback<Uint8Array, Error, [string]>(
    useCallback(
      async (recoveryKey) => {
        const decodedRecoveryKey = decodeRecoveryKey(recoveryKey);

        const match = await mx.secretStorage.checkKey(decodedRecoveryKey, keyContent as any);

        if (!match) {
          throw new Error(t('invalidRecoveryKey', { defaultValue: 'Invalid recovery key.' }));
        }

        return decodedRecoveryKey;
      },
      [mx, keyContent, t]
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
          <Text size="L400">{t('recoveryKey', { defaultValue: 'Recovery Key' })}</Text>
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
              {t('verify', { defaultValue: 'Verify' })}
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
