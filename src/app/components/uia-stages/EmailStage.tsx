import React, { useEffect, useCallback, FormEventHandler } from 'react';
import { Dialog, Text, Box, Button, config, Input, color, Spinner } from 'folds';
import { AuthType, MatrixError } from 'matrix-js-sdk';
import { StageComponentProps } from './types';
import { AsyncState, AsyncStatus } from '../../hooks/useAsyncCallback';
import { RegisterEmailCallback, RegisteredEmailResponse } from '../../hooks/useRegisterEmail';

function EmailErrorDialog({
  title,
  message,
  defaultEmail,
  onRetry,
  onCancel,
}: {
  title: string;
  message: string;
  defaultEmail?: string;
  onRetry: (email: string) => void;
  onCancel: () => void;
}) {
  const handleFormSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { retryEmailInput } = evt.target as HTMLFormElement & {
      retryEmailInput: HTMLInputElement;
    };
    const t = retryEmailInput.value;
    onRetry(t);
  };

  return (
    <Dialog>
      <Box
        as="form"
        onSubmit={handleFormSubmit}
        style={{ padding: config.space.S400 }}
        direction="Column"
        gap="400"
      >
        <Box direction="Column" gap="100">
          <Text size="H4">{title}</Text>
          <Text>{message}</Text>
          <Text as="label" size="L400" style={{ paddingTop: config.space.S400 }}>
            Email
          </Text>
          <Input
            name="retryEmailInput"
            variant="Background"
            size="500"
            outlined
            defaultValue={defaultEmail}
            required
          />
        </Box>
        <Button variant="Primary" type="submit">
          <Text as="span" size="B400">
            Send Verification Email
          </Text>
        </Button>
        <Button variant="Critical" fill="None" outlined type="button" onClick={onCancel}>
          <Text as="span" size="B400">
            Cancel
          </Text>
        </Button>
      </Box>
    </Dialog>
  );
}

export function EmailStageDialog({
  email,
  clientSecret,
  stageData,
  registerEmailState,
  registerEmail,
  submitAuthDict,
  onCancel,
}: StageComponentProps & {
  email?: string;
  clientSecret: string;
  registerEmailState: AsyncState<RegisteredEmailResponse, MatrixError>;
  registerEmail: RegisterEmailCallback;
}) {
  const { errorCode, error, session } = stageData;

  const handleSubmit = useCallback(
    (sessionId: string) => {
      const threepIDCreds = {
        sid: sessionId,
        client_secret: clientSecret,
      };
      submitAuthDict({
        type: AuthType.Email,
        threepid_creds: threepIDCreds,
        threepidCreds: threepIDCreds,
        session,
      });
    },
    [submitAuthDict, session, clientSecret]
  );

  const handleEmailSubmit = useCallback(
    (userEmail: string) => {
      registerEmail(userEmail, clientSecret);
    },
    [clientSecret, registerEmail]
  );

  useEffect(() => {
    if (email && !errorCode && registerEmailState.status === AsyncStatus.Idle) {
      registerEmail(email, clientSecret);
    }
  }, [email, errorCode, clientSecret, registerEmailState, registerEmail]);

  if (registerEmailState.status === AsyncStatus.Loading) {
    return (
      <Box direction="Column" alignItems="Center" gap="400">
        <Spinner variant="Secondary" size="600" />
        <Text style={{ color: color.Secondary.Main }}>Sending verification email...</Text>
      </Box>
    );
  }

  if (registerEmailState.status === AsyncStatus.Error) {
    return (
      <EmailErrorDialog
        title={registerEmailState.error.errcode ?? 'Verify Email'}
        message={
          registerEmailState.error?.data?.error ??
          registerEmailState.error.message ??
          'Failed to send Email verification request.'
        }
        onRetry={handleEmailSubmit}
        onCancel={onCancel}
      />
    );
  }

  if (registerEmailState.status === AsyncStatus.Success) {
    return (
      <Dialog>
        <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
          <Box direction="Column" gap="100">
            <Text size="H4">Verification Request Sent</Text>
            <Text>{`Please check your email "${registerEmailState.data.email}" and validate before continuing further.`}</Text>

            {errorCode && (
              <Text style={{ color: color.Critical.Main }}>{`${errorCode}: ${error}`}</Text>
            )}
          </Box>
          <Button
            variant="Primary"
            onClick={() => handleSubmit(registerEmailState.data.result.sid)}
          >
            <Text as="span" size="B400">
              Continue
            </Text>
          </Button>
        </Box>
      </Dialog>
    );
  }

  if (!email) {
    return (
      <EmailErrorDialog
        title="Provide Email"
        message="Please provide email to send verification request."
        onRetry={handleEmailSubmit}
        onCancel={onCancel}
      />
    );
  }

  return null;
}
