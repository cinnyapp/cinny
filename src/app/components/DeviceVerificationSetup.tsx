import React, {
  FormEventHandler,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
  ProgressBar,
} from 'folds';
import FileSaver from 'file-saver';
import { BackupManager } from 'neurone/lib/crypto/machine/backup';
import { putAccountData } from 'neurone/lib/api/matrix/client/v3/user';
import {
  AesHmacSha2,
  AesHmacSha2KeyDescription,
  DefaultKey,
  KeyStorage,
  Passphrase,
  RecoveryKey,
  Secret,
  SECRET_STORAGE_ALGORITHM_V1_AES_HMAC_SHA2,
} from 'neurone/lib/crypto/ssss';
import {
  MatrixRequestRetrier,
  MatrixUIAData,
  MatrixUIAHandler,
  randomString,
  sleep,
} from 'neurone/lib/utils';
import { postVersion, PostVersionBody } from 'neurone/lib/api/matrix/client/v3/roomKeys';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { postDeviceSigningUpload } from 'neurone/lib/api/matrix/client/v3/keys';
import { PasswordInput } from './password-input';
import { ContainerColor } from '../styles/ContainerColor.css';
import { copyToClipboard } from '../utils/dom';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { ActionUIA, ActionUIAFlowsLoader } from './ActionUIA';
import { UseStateProvider } from './UseStateProvider';
import { useClient } from '../hooks/useClient';
import { getMxIdLocalPart, getMxIdServer } from '../utils/matrix';
import { AccountDataType } from '../../types/matrix/accountData';
import { useAlive } from '../hooks/useAlive';

type SetupProgressChecklist = {
  bootstrapCrossSinging?: boolean;
  putMasterAccountData?: boolean;
  putSelfAccountData?: boolean;
  putUserAcountData?: boolean;
  verfiyOwnDevice?: boolean;
  postBackupVersion?: boolean;
  putBackupAccountData?: boolean;
  putRecoveryKeyAccountData?: boolean;
  putDefaultKeyAccountData?: boolean;
};

type SetupVerificationProps = {
  onComplete: (recoveryKey: string) => void;
};
function SetupVerification({ onComplete }: SetupVerificationProps) {
  const ct = useClient();
  const uia = useMemo(() => new MatrixUIAHandler(), []);
  const [uiaData, setUIAData] = useState<MatrixUIAData>();
  const [setupProgress, setSetupProgress] = useState<SetupProgressChecklist>();
  const alive = useAlive();

  useEffect(() => uia.onUIA.subscribe(setUIAData), [uia]);

  const handleAction = useCallback(
    (authDict: object) => {
      setUIAData(undefined);
      uia.retry(authDict);
    },
    [uia]
  );

  const handleCancel = useCallback(() => {
    setUIAData(undefined);
    uia.clear();
  }, [uia]);

  const [setupState, setup] = useAsyncCallback<void, Error, [string | undefined]>(
    useCallback(
      async (passphrase) => {
        setSetupProgress({});
        const retrier = new MatrixRequestRetrier(sleep);

        const defaultKeyId = randomString(16);

        const passData = passphrase ? await Passphrase.create(passphrase) : undefined;
        const recoveryKey = passData?.key ?? AesHmacSha2.generateRawKey();

        const uploadDeviceSigningKeys = async (bodyStr: string) => {
          const body = JSON.parse(bodyStr);
          const resp = await retrier.execute(() =>
            uia.execute((authData) =>
              ct.requestAuthJSON(postDeviceSigningUpload({ body: { ...body, auth: authData } }))
            )
          );
          const [err] = await parseMatrixResp(resp);
          if (err) throw new Error(err.data.error ?? err.data.errcode);
        };

        await ct.machine.crossSigning.bootstrapCrossSigning(uploadDeviceSigningKeys);
        const crossSigning = await ct.machine.crossSigning.exportKeys();
        if (!crossSigning || !crossSigning.master || !crossSigning.self || !crossSigning.user) {
          throw new Error('Failed to reset cross signing. No cross signing keys available.');
        }
        if (alive()) setSetupProgress((v) => ({ ...v, bootstrapCrossSinging: true }));

        const masterEnc = await AesHmacSha2.encrypt(
          recoveryKey,
          AccountDataType.CrossSigningMaster,
          crossSigning.master
        );
        const selfEnc = await AesHmacSha2.encrypt(
          recoveryKey,
          AccountDataType.CrossSigningSelf,
          crossSigning.self
        );
        const userEnc = await AesHmacSha2.encrypt(
          recoveryKey,
          AccountDataType.CrossSigningUser,
          crossSigning.user
        );

        const { userId } = ct.session;
        const masterSecret: Secret = { encrypted: { [defaultKeyId]: masterEnc } };
        const selfSecret: Secret = { encrypted: { [defaultKeyId]: selfEnc } };
        const userSecret: Secret = { encrypted: { [defaultKeyId]: userEnc } };
        await retrier.execute(() =>
          ct.requestAuthJSON(
            putAccountData({
              pathParams: { userId, type: AccountDataType.CrossSigningMaster },
              body: masterSecret,
            })
          )
        );
        if (alive()) setSetupProgress((v) => ({ ...v, putMasterAccountData: true }));
        await retrier.execute(() =>
          ct.requestAuthJSON(
            putAccountData({
              pathParams: { userId, type: AccountDataType.CrossSigningSelf },
              body: selfSecret,
            })
          )
        );
        if (alive()) setSetupProgress((v) => ({ ...v, putSelfAccountData: true }));
        await retrier.execute(() =>
          ct.requestAuthJSON(
            putAccountData({
              pathParams: { userId, type: AccountDataType.CrossSigningUser },
              body: userSecret,
            })
          )
        );
        if (alive()) setSetupProgress((v) => ({ ...v, putUserAcountData: true }));

        const device = await ct.machine.userTracker.getDevice(
          ct.session.userId,
          ct.session.deviceId
        );
        if (device && !device.crossSigningTrusted) {
          const resp = await device.verify();
          const [err] = await parseMatrixResp(resp);
          if (err) {
            throw new Error(err.data.error ?? 'Failed to verify. Signature upload request failed.');
          }
          await ct.machine.outgoingRequests.queryKeys([ct.session.userId]);
        }
        if (alive()) setSetupProgress((v) => ({ ...v, verfiyOwnDevice: true }));

        const backupKey = BackupManager.createBackupKey();
        await ct.megolmBackup.cacheDecryptionKey(backupKey.privateKey);

        const backupEnc = await AesHmacSha2.encrypt(
          recoveryKey,
          AccountDataType.MegolmBackupV1,
          backupKey.privateKey
        );

        const backupAuthData = {
          public_key: backupKey.publicKey,
        };
        await ct.machine.sign(backupAuthData);

        const backupVersion: PostVersionBody = {
          algorithm: backupKey.algorithm,
          auth_data: backupAuthData,
        };
        await retrier.execute(() => ct.requestAuthJSON(postVersion({ body: backupVersion })));
        if (alive()) setSetupProgress((v) => ({ ...v, postBackupVersion: true }));

        const backupSecret: Secret = { encrypted: { [defaultKeyId]: backupEnc } };

        await retrier.execute(() =>
          ct.requestAuthJSON(
            putAccountData({
              pathParams: { userId, type: AccountDataType.MegolmBackupV1 },
              body: backupSecret,
            })
          )
        );
        if (alive()) setSetupProgress((v) => ({ ...v, putBackupAccountData: true }));

        const { iv, mac } = await AesHmacSha2.driveKeyMetaData(recoveryKey);

        const keyDescription: AesHmacSha2KeyDescription = {
          algorithm: SECRET_STORAGE_ALGORITHM_V1_AES_HMAC_SHA2,
          passphrase: passData?.passphrase,
          iv,
          mac,
        };
        await retrier.execute(() =>
          ct.requestAuthJSON(
            putAccountData({
              pathParams: { userId, type: KeyStorage.keyIdentifier(defaultKeyId) },
              body: keyDescription,
            })
          )
        );
        if (alive()) setSetupProgress((v) => ({ ...v, putRecoveryKeyAccountData: true }));
        const defaultKey: DefaultKey = {
          key: defaultKeyId,
        };
        await retrier.execute(() =>
          ct.requestAuthJSON(
            putAccountData({
              pathParams: { userId, type: KeyStorage.defaultKeyIdentifier() },
              body: defaultKey,
            })
          )
        );
        if (alive()) setSetupProgress((v) => ({ ...v, putDefaultKeyAccountData: true }));

        onComplete(RecoveryKey.encode(recoveryKey));
      },
      [ct, uia, onComplete, alive]
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

  const setupSteps: {
    key: keyof SetupProgressChecklist;
    label: string;
  }[] = useMemo(
    () => [
      { key: 'bootstrapCrossSinging', label: 'Setting up cross-signing' },
      { key: 'putMasterAccountData', label: 'Securing your master signing key' },
      { key: 'putSelfAccountData', label: 'Securing your self signing key' },
      { key: 'putUserAcountData', label: 'Securing your user signing key' },
      { key: 'verfiyOwnDevice', label: 'Verifying this device' },
      { key: 'postBackupVersion', label: 'Creating your secure backup' },
      { key: 'putBackupAccountData', label: 'Securing your backup key' },
      { key: 'putRecoveryKeyAccountData', label: 'Saving your recovery key information' },
      { key: 'putDefaultKeyAccountData', label: 'Setting up your recovery key' },
    ],
    []
  );

  const completedSteps = setupSteps.filter(({ key }) => setupProgress?.[key] === true).length;

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="400">
      {setupProgress ? (
        <Box direction="Column" gap="400">
          <Text size="L400">Setup progress</Text>
          <Box style={{ paddingLeft: config.space.S200 }} direction="Column" gap="100">
            {setupSteps.map(({ key, label }) => (
              <Text size="T200" key={key}>
                {setupProgress[key] ? '✅' : '⏳'} {label}
              </Text>
            ))}
          </Box>
          <ProgressBar variant="Secondary" size="300" min={0} value={completedSteps} />
        </Box>
      ) : (
        <>
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
        </>
      )}
      {setupState.status === AsyncStatus.Error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{setupState.error ? setupState.error.message : 'Unexpected Error!'}</b>
        </Text>
      )}
      {uiaData && (
        <ActionUIAFlowsLoader
          authData={uiaData}
          onCancel={handleCancel}
          unsupported={() => (
            <Text size="T200" style={{ color: color.Critical.Main }}>
              Authentication steps to perform this action are not supported by client.
            </Text>
          )}
        >
          {(ongoingFlow) => (
            <ActionUIA
              authData={uiaData}
              ongoingFlow={ongoingFlow}
              action={handleAction}
              onCancel={handleCancel}
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
  const ct = useClient();
  const [show, setShow] = useState(false);

  const handleCopy = () => {
    copyToClipboard(recoveryKey);
  };

  const handleDownload = () => {
    const username = getMxIdLocalPart(ct.session.userId);
    const servername = getMxIdServer(ct.session.userId);

    const blob = new Blob([recoveryKey], {
      type: 'text/plain;charset=us-ascii',
    });
    FileSaver.saveAs(blob, `Recovery Key - ${username} (${servername}).txt`);
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
        <Button onClick={handleDownload}>
          <Text size="B400">Download</Text>
        </Button>
        <Button onClick={handleCopy} fill="Soft">
          <Text size="B400">Copy</Text>
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
