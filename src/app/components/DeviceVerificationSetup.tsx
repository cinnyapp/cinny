import React, { FormEventHandler, forwardRef, useCallback, useState } from 'react';
import {
  Dialog,
  Header,
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  config,
  Button,
  Chip,
  color,
  Spinner,
} from 'folds';
import to from 'await-to-js';
import { AuthDict, IAuthData, MatrixError, UIAuthCallback } from 'matrix-js-sdk';
import { saveFile } from '../utils/file-saver';
import { PasswordInput } from './password-input';
import { ContainerColor } from '../styles/ContainerColor.css';
import { copyToClipboard } from '../utils/dom';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { clearSecretStorageKeys } from '../../client/secretStorageKeys';
import { ActionUIA, ActionUIAFlowsLoader } from './ActionUIA';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { useAlive } from '../hooks/useAlive';
import { UseStateProvider } from './UseStateProvider';

type UIACallback<T> = (
  authDict: AuthDict | null
) => Promise<[IAuthData, undefined] | [undefined, T]>;

type PerformAction<T> = (authDict: AuthDict | null) => Promise<T>;

type UIAAction<T> = {
  authData: IAuthData;
  callback: UIACallback<T>;
  cancelCallback: () => void;
};

function makeUIAAction<T>(
  authData: IAuthData,
  performAction: PerformAction<T>,
  resolve: (data: T) => void,
  reject: (error?: any) => void
): UIAAction<T> {
  const action: UIAAction<T> = {
    authData,
    callback: async (authDict) => {
      const [error, data] = await to<T, MatrixError | Error>(performAction(authDict));

      if (error instanceof MatrixError && error.httpStatus === 401) {
        return [error.data as IAuthData, undefined];
      }

      if (error) {
        reject(error);
        throw error;
      }

      resolve(data);
      return [undefined, data];
    },
    cancelCallback: reject,
  };

  return action;
}

type SetupVerificationProps = {
  onComplete: (recoveryKey: string) => void;
};
function SetupVerification({ onComplete }: SetupVerificationProps) {
  const mx = useMatrixClient();
  const alive = useAlive();

  const [uiaAction, setUIAAction] = useState<UIAAction<void>>();
  const [nextAuthData, setNextAuthData] = useState<IAuthData | null>(); // null means no next action.

  const handleAction = useCallback(
    async (authDict: AuthDict) => {
      if (!uiaAction) {
        throw new Error('Unexpected Error! UIA action is perform without data.');
      }
      if (alive()) {
        setNextAuthData(null);
      }
      const [authData] = await uiaAction.callback(authDict);

      if (alive() && authData) {
        setNextAuthData(authData);
      }
    },
    [uiaAction, alive]
  );

  const resetUIA = useCallback(() => {
    if (!alive()) return;
    setUIAAction(undefined);
    setNextAuthData(undefined);
  }, [alive]);

  const authUploadDeviceSigningKeys: UIAuthCallback<void> = useCallback(
    (makeRequest) =>
      new Promise<void>((resolve, reject) => {
        makeRequest(null)
          .then(() => {
            resolve();
            resetUIA();
          })
          .catch((error) => {
            if (error instanceof MatrixError && error.httpStatus === 401) {
              const authData = error.data as IAuthData;
              const action = makeUIAAction(
                authData,
                makeRequest as PerformAction<void>,
                resolve,
                (err) => {
                  resetUIA();
                  reject(err);
                }
              );
              if (alive()) {
                setUIAAction(action);
              } else {
                reject(new Error('Authentication failed! Failed to setup device verification.'));
              }
              return;
            }
            reject(error);
          });
      }),
    [alive, resetUIA]
  );

  const [setupState, setup] = useAsyncCallback<void, Error, [string | undefined]>(
    useCallback(
      async (passphrase) => {
        const crypto = mx.getCrypto();
        if (!crypto) throw new Error('Unexpected Error! Crypto module not found!');

        const recoveryKeyData = await crypto.createRecoveryKeyFromPassphrase(passphrase);
        if (!recoveryKeyData.encodedPrivateKey) {
          throw new Error('Unexpected Error! Failed to create recovery key.');
        }
        clearSecretStorageKeys();

        await crypto.bootstrapSecretStorage({
          createSecretStorageKey: async () => recoveryKeyData,
          setupNewSecretStorage: true,
        });

        await crypto.bootstrapCrossSigning({
          authUploadDeviceSigningKeys,
          setupNewCrossSigning: true,
        });

        await crypto.resetKeyBackup();

        onComplete(recoveryKeyData.encodedPrivateKey);
      },
      [mx, onComplete, authUploadDeviceSigningKeys]
    )
  );

  const loading = setupState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (loading) return;

    const target = evt.target as HTMLFormElement | undefined;
    const passphraseInput = target?.passphraseInput as HTMLInputElement | undefined;
    let passphrase: string | undefined;
    if (passphraseInput && passphraseInput.value.length > 0) {
      passphrase = passphraseInput.value;
    }

    setup(passphrase);
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="400">
      <Text size="T300">
        Generate a <b>Recovery Key</b> for verifying identity if you do not have access to other
        devices. Additionally, setup a passphrase as a memorable alternative.
      </Text>
      <Box direction="Column" gap="100">
        <Text size="L400">Passphrase (Optional)</Text>
        <PasswordInput name="passphraseInput" size="400" readOnly={loading} />
      </Box>
      <Button
        type="submit"
        disabled={loading}
        before={loading && <Spinner size="200" variant="Primary" fill="Solid" />}
      >
        <Text size="B400">Continue</Text>
      </Button>
      {setupState.status === AsyncStatus.Error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{setupState.error ? setupState.error.message : 'Unexpected Error!'}</b>
        </Text>
      )}
      {nextAuthData !== null && uiaAction && (
        <ActionUIAFlowsLoader
          authData={nextAuthData ?? uiaAction.authData}
          unsupported={() => (
            <Text size="T200">
              Authentication steps to perform this action are not supported by client.
            </Text>
          )}
        >
          {(ongoingFlow) => (
            <ActionUIA
              authData={nextAuthData ?? uiaAction.authData}
              ongoingFlow={ongoingFlow}
              action={handleAction}
              onCancel={uiaAction.cancelCallback}
            />
          )}
        </ActionUIAFlowsLoader>
      )}
    </Box>
  );
}

type RecoveryKeyDisplayProps = {
  recoveryKey: string;
};
function RecoveryKeyDisplay({ recoveryKey }: RecoveryKeyDisplayProps) {
  const [show, setShow] = useState(false);

  const handleCopy = () => {
    copyToClipboard(recoveryKey);
  };

  const handleDownload = () => {
    const blob = new Blob([recoveryKey], {
      type: 'text/plain;charset=us-ascii',
    });
    saveFile(blob, 'recovery-key.txt');
  };

  const safeToDisplayKey = show ? recoveryKey : recoveryKey.replace(/[^\s]/g, '*');

  return (
    <Box direction="Column" gap="400">
      <Text size="T300">
        Store the Recovery Key in a safe place for future use, as you will need it to verify your
        identity if you do not have access to other devices.
      </Text>
      <Box direction="Column" gap="100">
        <Text size="L400">Recovery Key</Text>
        <Box
          className={ContainerColor({ variant: 'SurfaceVariant' })}
          style={{
            padding: config.space.S300,
            borderRadius: config.radii.R400,
          }}
          alignItems="Center"
          justifyContent="Center"
          gap="400"
        >
          <Text style={{ fontFamily: 'monospace' }} size="T200" priority="300">
            {safeToDisplayKey}
          </Text>
          <Chip onClick={() => setShow(!show)} variant="Secondary" radii="Pill">
            <Text size="B300">{show ? 'Hide' : 'Show'}</Text>
          </Chip>
        </Box>
      </Box>
      <Box direction="Column" gap="200">
        <Button onClick={handleCopy}>
          <Text size="B400">Copy</Text>
        </Button>
        <Button onClick={handleDownload} fill="Soft">
          <Text size="B400">Download</Text>
        </Button>
      </Box>
    </Box>
  );
}

type DeviceVerificationSetupProps = {
  onCancel: () => void;
};
export const DeviceVerificationSetup = forwardRef<HTMLDivElement, DeviceVerificationSetupProps>(
  ({ onCancel }, ref) => {
    const [recoveryKey, setRecoveryKey] = useState<string>();

    return (
      <Dialog ref={ref}>
        <Header
          style={{
            padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
            borderBottomWidth: config.borderWidth.B300,
          }}
          variant="Surface"
          size="500"
        >
          <Box grow="Yes">
            <Text size="H4">Setup Device Verification</Text>
          </Box>
          <IconButton size="300" radii="300" onClick={onCancel}>
            <Icon src={Icons.Cross} />
          </IconButton>
        </Header>
        <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
          {recoveryKey ? (
            <RecoveryKeyDisplay recoveryKey={recoveryKey} />
          ) : (
            <SetupVerification onComplete={setRecoveryKey} />
          )}
        </Box>
      </Dialog>
    );
  }
);
type DeviceVerificationResetProps = {
  onCancel: () => void;
};
export const DeviceVerificationReset = forwardRef<HTMLDivElement, DeviceVerificationResetProps>(
  ({ onCancel }, ref) => {
    const [reset, setReset] = useState(false);

    return (
      <Dialog ref={ref}>
        <Header
          style={{
            padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
            borderBottomWidth: config.borderWidth.B300,
          }}
          variant="Surface"
          size="500"
        >
          <Box grow="Yes">
            <Text size="H4">Reset Device Verification</Text>
          </Box>
          <IconButton size="300" radii="300" onClick={onCancel}>
            <Icon src={Icons.Cross} />
          </IconButton>
        </Header>
        {reset ? (
          <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
            <UseStateProvider initial={undefined}>
              {(recoveryKey: string | undefined, setRecoveryKey) =>
                recoveryKey ? (
                  <RecoveryKeyDisplay recoveryKey={recoveryKey} />
                ) : (
                  <SetupVerification onComplete={setRecoveryKey} />
                )
              }
            </UseStateProvider>
          </Box>
        ) : (
          <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
            <Box direction="Column" gap="200">
              <Text size="H1">✋🧑‍🚒🤚</Text>
              <Text size="T300">Resetting device verification is permanent.</Text>
              <Text size="T300">
                Anyone you have verified with will see security alerts and your encryption backup
                will be lost. You almost certainly do not want to do this, unless you have lost{' '}
                <b>Recovery Key</b> or <b>Recovery Passphrase</b> and every device you can verify
                from.
              </Text>
            </Box>
            <Button variant="Critical" onClick={() => setReset(true)}>
              <Text size="B400">Reset</Text>
            </Button>
          </Box>
        )}
      </Dialog>
    );
  }
);
