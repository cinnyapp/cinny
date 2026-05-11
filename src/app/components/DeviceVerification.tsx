import {
  ShowSasCallbacks,
  VerificationPhase,
  VerificationRequest,
  Verifier,
} from 'matrix-js-sdk/lib/crypto-api';
import React, { CSSProperties, useCallback, useEffect, useState } from 'react';
import { VerificationMethod } from 'matrix-js-sdk/lib/types';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  config,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import {
  useVerificationRequestPhase,
  useVerificationRequestReceived,
  useVerifierCancel,
  useVerifierShowSas,
} from '../hooks/useVerificationRequest';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { ContainerColor } from '../styles/ContainerColor.css';

const DialogHeaderStyles: CSSProperties = {
  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
  borderBottomWidth: config.borderWidth.B300,
};

type WaitingMessageProps = {
  message: string;
};
function WaitingMessage({ message }: WaitingMessageProps) {
  return (
    <Box alignItems="Center" gap="200">
      <Spinner variant="Secondary" size="200" />
      <Text size="T300">{message}</Text>
    </Box>
  );
}

type VerificationUnexpectedProps = { message: string; onClose: () => void };
function VerificationUnexpected({ message, onClose }: VerificationUnexpectedProps) {
  const { t } = useTranslation('common');
  return (
    <Box direction="Column" gap="400">
      <Text>{message}</Text>
      <Button variant="Secondary" fill="Soft" onClick={onClose}>
        <Text size="B400">{t('close', { defaultValue: 'Close' })}</Text>
      </Button>
    </Box>
  );
}

function VerificationWaitAccept() {
  const { t } = useTranslation('common');
  return (
    <Box direction="Column" gap="400">
      <Text>{t('acceptRequestFromOtherDevice', { defaultValue: 'Please accept the request from other device.' })}</Text>
      <WaitingMessage
        message={t('waitingRequestAccepted', { defaultValue: 'Waiting for request to be accepted...' })}
      />
    </Box>
  );
}

type VerificationAcceptProps = {
  onAccept: () => Promise<void>;
};
function VerificationAccept({ onAccept }: VerificationAcceptProps) {
  const { t } = useTranslation('common');
  const [acceptState, accept] = useAsyncCallback(onAccept);

  const accepting = acceptState.status === AsyncStatus.Loading;
  return (
    <Box direction="Column" gap="400">
      <Text>{t('clickAcceptStartVerification', { defaultValue: 'Click accept to start the verification process.' })}</Text>
      <Button
        variant="Primary"
        fill="Solid"
        onClick={accept}
        before={accepting && <Spinner size="100" variant="Primary" fill="Solid" />}
        disabled={accepting}
      >
        <Text size="B400">{t('accept', { defaultValue: 'Accept' })}</Text>
      </Button>
    </Box>
  );
}

function VerificationWaitStart() {
  const { t } = useTranslation('common');
  return (
    <Box direction="Column" gap="400">
      <Text>{t('verificationRequestAccepted', { defaultValue: 'Verification request has been accepted.' })}</Text>
      <WaitingMessage
        message={t('waitingResponseOtherDevice', {
          defaultValue: 'Waiting for the response from other device...',
        })}
      />
    </Box>
  );
}

type VerificationStartProps = {
  onStart: () => Promise<void>;
};
function AutoVerificationStart({ onStart }: VerificationStartProps) {
  const { t } = useTranslation('common');
  useEffect(() => {
    onStart();
  }, [onStart]);

  return (
    <Box direction="Column" gap="400">
      <WaitingMessage
        message={t('startingEmojiVerification', {
          defaultValue: 'Starting verification using emoji comparison...',
        })}
      />
    </Box>
  );
}

function CompareEmoji({ sasData }: { sasData: ShowSasCallbacks }) {
  const { t } = useTranslation('common');
  const [confirmState, confirm] = useAsyncCallback(useCallback(() => sasData.confirm(), [sasData]));

  const confirming =
    confirmState.status === AsyncStatus.Loading || confirmState.status === AsyncStatus.Success;

  return (
    <Box direction="Column" gap="400">
      <Text>
        {t('confirmEmojiMatch', {
          defaultValue: 'Confirm the emoji below are displayed on both devices, in the same order:',
        })}
      </Text>
      <Box
        className={ContainerColor({ variant: 'SurfaceVariant' })}
        style={{
          borderRadius: config.radii.R400,
          padding: config.space.S500,
        }}
        gap="700"
        wrap="Wrap"
        justifyContent="Center"
      >
        {sasData.sas.emoji?.map(([emoji, name], index) => (
          <Box
            // eslint-disable-next-line react/no-array-index-key
            key={`${emoji}${name}${index}`}
            direction="Column"
            gap="100"
            justifyContent="Center"
            alignItems="Center"
          >
            <Text size="H1">{emoji}</Text>
            <Text size="T200">{name}</Text>
          </Box>
        ))}
      </Box>
      <Box direction="Column" gap="200">
        <Button
          variant="Primary"
          fill="Soft"
          onClick={confirm}
          disabled={confirming}
          before={confirming && <Spinner size="100" variant="Primary" />}
        >
          <Text size="B400">{t('theyMatch', { defaultValue: 'They Match' })}</Text>
        </Button>
        <Button
          variant="Primary"
          fill="Soft"
          onClick={() => sasData.mismatch()}
          disabled={confirming}
        >
          <Text size="B400">{t('doNotMatch', { defaultValue: 'Do not Match' })}</Text>
        </Button>
      </Box>
    </Box>
  );
}

type SasVerificationProps = {
  verifier: Verifier;
  onCancel: () => void;
};
function SasVerification({ verifier, onCancel }: SasVerificationProps) {
  const { t } = useTranslation('common');
  const [sasData, setSasData] = useState<ShowSasCallbacks>();

  useVerifierShowSas(verifier, setSasData);
  useVerifierCancel(verifier, onCancel);

  useEffect(() => {
    verifier.verify();
  }, [verifier]);

  if (sasData) {
    return <CompareEmoji sasData={sasData} />;
  }

  return (
    <Box direction="Column" gap="400">
      <WaitingMessage
        message={t('startingEmojiVerification', {
          defaultValue: 'Starting verification using emoji comparison...',
        })}
      />
    </Box>
  );
}

type VerificationDoneProps = {
  onExit: () => void;
};
function VerificationDone({ onExit }: VerificationDoneProps) {
  const { t } = useTranslation('common');
  return (
    <Box direction="Column" gap="400">
      <div>
        <Text>{t('deviceVerified', { defaultValue: 'Your device is verified.' })}</Text>
      </div>
      <Button variant="Primary" fill="Solid" onClick={onExit}>
        <Text size="B400">{t('okay', { defaultValue: 'Okay' })}</Text>
      </Button>
    </Box>
  );
}

type VerificationCanceledProps = {
  onClose: () => void;
};
function VerificationCanceled({ onClose }: VerificationCanceledProps) {
  const { t } = useTranslation('common');
  return (
    <Box direction="Column" gap="400">
      <Text>{t('verificationCanceled', { defaultValue: 'Verification has been canceled.' })}</Text>
      <Button variant="Secondary" fill="Soft" onClick={onClose}>
        <Text size="B400">{t('close', { defaultValue: 'Close' })}</Text>
      </Button>
    </Box>
  );
}

type DeviceVerificationProps = {
  request: VerificationRequest;
  onExit: () => void;
};
export function DeviceVerification({ request, onExit }: DeviceVerificationProps) {
  const { t } = useTranslation('common');
  const phase = useVerificationRequestPhase(request);

  const handleCancel = useCallback(() => {
    if (request.phase !== VerificationPhase.Done && request.phase !== VerificationPhase.Cancelled) {
      request.cancel();
    }
    onExit();
  }, [request, onExit]);

  const handleAccept = useCallback(() => request.accept(), [request]);
  const handleStart = useCallback(async () => {
    await request.startVerification(VerificationMethod.Sas);
  }, [request]);

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: false,
            escapeDeactivates: false,
          }}
        >
          <Dialog variant="Surface">
            <Header style={DialogHeaderStyles} variant="Surface" size="500">
              <Box grow="Yes">
                <Text size="H4">{t('deviceVerification', { defaultValue: 'Device Verification' })}</Text>
              </Box>
              <IconButton size="300" radii="300" onClick={handleCancel}>
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              {phase === VerificationPhase.Requested &&
                (request.initiatedByMe ? (
                  <VerificationWaitAccept />
                ) : (
                  <VerificationAccept onAccept={handleAccept} />
                ))}
              {phase === VerificationPhase.Ready &&
                (request.initiatedByMe ? (
                  <AutoVerificationStart onStart={handleStart} />
                ) : (
                  <VerificationWaitStart />
                ))}
              {phase === VerificationPhase.Started &&
                (request.verifier ? (
                  <SasVerification verifier={request.verifier} onCancel={handleCancel} />
                ) : (
                  <VerificationUnexpected
                    message={t('unexpectedVerificationMissingVerifier', {
                      defaultValue: 'Unexpected Error! Verification is started but verifier is missing.',
                    })}
                    onClose={handleCancel}
                  />
                ))}
              {phase === VerificationPhase.Done && <VerificationDone onExit={onExit} />}
              {phase === VerificationPhase.Cancelled && (
                <VerificationCanceled onClose={handleCancel} />
              )}
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

export function ReceiveSelfDeviceVerification() {
  const [request, setRequest] = useState<VerificationRequest>();

  useVerificationRequestReceived(setRequest);

  const handleExit = useCallback(() => {
    setRequest(undefined);
  }, []);

  if (!request) return null;

  if (!request.isSelfVerification) {
    return null;
  }

  return <DeviceVerification request={request} onExit={handleExit} />;
}
