import React, { CSSProperties, useCallback, useEffect, useState } from 'react';
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
  CancelableVerificationStage,
  CancelVerificationStage,
  DoneVerificationStage,
  InboundRequestStage,
  InboundVerification,
  OutboundRequestStage,
  OutboundVerification,
  ReadyVerificationStage,
  SasAcceptStage,
  SasCancelState,
  SasMethod,
  SasStartStage,
  StartVerificationStage,
} from 'neurone/lib/crypto/machine/verification';
import { useVerificationRequestReceived } from '../hooks/useVerificationRequest';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { ContainerColor } from '../styles/ContainerColor.css';
import { useObservableValue } from '../hooks/useObservableValue';

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
  return (
    <Box direction="Column" gap="400">
      <Text>{message}</Text>
      <Button variant="Secondary" fill="Soft" onClick={onClose}>
        <Text size="B400">Close</Text>
      </Button>
    </Box>
  );
}

function VerificationWaitAccept() {
  return (
    <Box direction="Column" gap="400">
      <Text>Please accept the request from other device.</Text>
      <WaitingMessage message="Waiting for request to be accepted..." />
    </Box>
  );
}

type VerificationAcceptProps = {
  stage: InboundRequestStage;
};
function VerificationAccept({ stage }: VerificationAcceptProps) {
  const [acceptState, accept] = useAsyncCallback(
    useCallback(() => stage.ready(['m.sas.v1']), [stage])
  );

  const accepting = acceptState.status === AsyncStatus.Loading;
  return (
    <Box direction="Column" gap="400">
      <Text>Click accept to start the verification process.</Text>
      <Button
        variant="Primary"
        fill="Solid"
        onClick={accept}
        before={accepting && <Spinner size="100" variant="Primary" fill="Solid" />}
        disabled={accepting}
      >
        <Text size="B400">Accept</Text>
      </Button>
    </Box>
  );
}

function VerificationWaitStart() {
  return (
    <Box direction="Column" gap="400">
      <Text>Verification request has been accepted.</Text>
      <WaitingMessage message="Waiting for the response from other device..." />
    </Box>
  );
}

type VerificationStartProps = {
  stage: ReadyVerificationStage;
};
function AutoVerificationStart({ stage }: VerificationStartProps) {
  useEffect(() => {
    stage.startSas();
  }, [stage]);

  return (
    <Box direction="Column" gap="400">
      <WaitingMessage message="Starting verification using emoji comparison..." />
    </Box>
  );
}

function CompareEmoji({ stage }: { stage: SasAcceptStage }) {
  const [confirmState, confirm] = useAsyncCallback(useCallback(() => stage.match(), [stage]));

  const confirming =
    confirmState.status === AsyncStatus.Loading || confirmState.status === AsyncStatus.Success;

  return (
    <Box direction="Column" gap="400">
      <Text>Confirm the emoji below are displayed on both devices, in the same order:</Text>
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
        {stage.emoji?.map((emoji, index) => (
          <Box
            // eslint-disable-next-line react/no-array-index-key
            key={`${emoji.description}${index}`}
            direction="Column"
            gap="100"
            justifyContent="Center"
            alignItems="Center"
          >
            <Text size="H1">{emoji.emoji}</Text>
            <Text size="T200">{emoji.description}</Text>
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
          <Text size="B400">They Match</Text>
        </Button>
        <Button
          variant="Primary"
          fill="Soft"
          onClick={() => stage.mismatch()}
          disabled={confirming}
        >
          <Text size="B400">Do not Match</Text>
        </Button>
      </Box>
    </Box>
  );
}

type SasVerificationProps = {
  sas: SasMethod;
  onCancel: () => void;
};
function SasVerification({ sas, onCancel }: SasVerificationProps) {
  const stage = useObservableValue(sas.stage);

  useEffect(() => {
    if (stage instanceof SasStartStage) {
      stage.accept();
    }
    if (stage instanceof SasCancelState) {
      onCancel();
    }
  }, [stage, onCancel]);

  if (stage instanceof SasAcceptStage && stage.emoji) {
    return <CompareEmoji stage={stage} />;
  }

  return (
    <Box direction="Column" gap="400">
      <WaitingMessage message="Starting verification using emoji comparison..." />
    </Box>
  );
}

type VerificationDoneProps = {
  onExit: () => void;
};
function VerificationDone({ onExit }: VerificationDoneProps) {
  return (
    <Box direction="Column" gap="400">
      <div>
        <Text>Your device is verified.</Text>
      </div>
      <Button variant="Primary" fill="Solid" onClick={onExit}>
        <Text size="B400">Okay</Text>
      </Button>
    </Box>
  );
}

type VerificationCanceledProps = {
  stage: CancelVerificationStage;
  onClose: () => void;
};
function VerificationCanceled({ stage, onClose }: VerificationCanceledProps) {
  return (
    <Box direction="Column" gap="400">
      <Text>Verification has been canceled. {stage.reason}</Text>
      <Button variant="Secondary" fill="Soft" onClick={onClose}>
        <Text size="B400">Close</Text>
      </Button>
    </Box>
  );
}

type DeviceVerificationProps = {
  request: InboundVerification | OutboundVerification;
  onExit: () => void;
};
export function DeviceVerification({ request, onExit }: DeviceVerificationProps) {
  const stage = useObservableValue(request.stage);

  const handleCancel = useCallback(() => {
    if (stage instanceof CancelableVerificationStage) {
      stage.cancel();
    }
    onExit();
  }, [stage, onExit]);

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
                <Text size="H4">Device Verification</Text>
              </Box>
              <IconButton size="300" radii="300" onClick={handleCancel}>
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              {stage instanceof InboundRequestStage && <VerificationAccept stage={stage} />}
              {stage instanceof OutboundRequestStage && <VerificationWaitAccept />}
              {stage instanceof ReadyVerificationStage &&
                (request instanceof OutboundRequestStage ? (
                  <AutoVerificationStart stage={stage} />
                ) : (
                  <VerificationWaitStart />
                ))}
              {stage instanceof StartVerificationStage &&
                (stage.method ? (
                  <SasVerification sas={stage.method} onCancel={handleCancel} />
                ) : (
                  <VerificationUnexpected
                    message="Unexpected Error! Verification is started but verifier is missing."
                    onClose={handleCancel}
                  />
                ))}

              {stage instanceof DoneVerificationStage && <VerificationDone onExit={onExit} />}
              {stage instanceof CancelVerificationStage && (
                <VerificationCanceled stage={stage} onClose={handleCancel} />
              )}
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

export function ReceiveSelfDeviceVerification() {
  const [request, setRequest] = useState<InboundVerification | OutboundVerification>();

  useVerificationRequestReceived(setRequest);

  const handleExit = useCallback(() => {
    setRequest(undefined);
  }, []);

  if (!request) return null;

  if (!request.selfVerification) {
    return null;
  }

  return <DeviceVerification request={request} onExit={handleExit} />;
}
