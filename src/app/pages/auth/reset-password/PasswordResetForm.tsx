import React, { FormEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  Input,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  color,
  config,
} from 'folds';
import { useNavigate } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { AuthDict, AuthType, MatrixError, createClient } from 'matrix-js-sdk';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { usePasswordEmail } from '../../../hooks/usePasswordEmail';
import { PasswordInput } from '../../../components/password-input/PasswordInput';
import { ConfirmPasswordMatch } from '../../../components/ConfirmPasswordMatch';
import { FieldError } from '../FiledError';
import { UIAFlowOverlay } from '../../../components/UIAFlowOverlay';
import { EmailStageDialog } from '../../../components/uia-stages';
import { ResetPasswordResult, resetPassword } from './resetPasswordUtil';
import { getLoginPath, withSearchParam } from '../../pathUtils';
import { LoginPathSearchParams } from '../../paths';
import { getUIAError, getUIAErrorCode } from '../../../utils/matrix-uia';

type FormData = {
  email: string;
  password: string;
  clientSecret: string;
};

function ResetPasswordComplete({ email }: { email?: string }) {
  const server = useAuthServer();

  const navigate = useNavigate();

  const handleClick = () => {
    const path = getLoginPath(server);
    if (email) {
      navigate(withSearchParam<LoginPathSearchParams>(path, { email }));
      return;
    }
    navigate(path);
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap>
          <Dialog>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              <Text>
                Password has been reset successfully. Please login with your new password.
              </Text>
              <Button variant="Primary" onClick={handleClick}>
                <Text size="B400" as="span">
                  Login
                </Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

type PasswordResetFormProps = {
  defaultEmail?: string;
};
export function PasswordResetForm({ defaultEmail }: PasswordResetFormProps) {
  const server = useAuthServer();

  const serverDiscovery = useAutoDiscoveryInfo();
  const baseUrl = serverDiscovery['m.homeserver'].base_url;
  const mx = useMemo(() => createClient({ baseUrl }), [baseUrl]);

  const [formData, setFormData] = useState<FormData>();

  const [passwordEmailState, passwordEmail] = usePasswordEmail(mx);

  const [resetPasswordState, handleResetPassword] = useAsyncCallback<
    ResetPasswordResult,
    MatrixError,
    [AuthDict, string]
  >(useCallback(async (authDict, newPassword) => resetPassword(mx, authDict, newPassword), [mx]));

  const [ongoingAuthData, resetPasswordResult] =
    resetPasswordState.status === AsyncStatus.Success ? resetPasswordState.data : [];
  const resetPasswordError =
    resetPasswordState.status === AsyncStatus.Error ? resetPasswordState.error : undefined;

  const flowErrorCode = ongoingAuthData && getUIAErrorCode(ongoingAuthData);
  const flowError = ongoingAuthData && getUIAError(ongoingAuthData);

  let waitingToVerifyEmail = true;
  if (resetPasswordResult) waitingToVerifyEmail = false;
  if (ongoingAuthData && flowErrorCode === undefined) waitingToVerifyEmail = false;
  if (resetPasswordError) waitingToVerifyEmail = false;
  if (resetPasswordState.status === AsyncStatus.Loading) waitingToVerifyEmail = false;

  // We only support UIA m.login.password stage for reset password
  // So we will assume to process it as soon as
  // we have 401 with no error on initial request.
  useEffect(() => {
    if (formData && ongoingAuthData && !flowErrorCode) {
      handleResetPassword(
        {
          type: AuthType.Password,
          identifier: {
            type: 'm.id.thirdparty',
            medium: 'email',
            address: formData.email,
          },
          password: formData.password,
        },
        formData.password
      );
    }
  }, [ongoingAuthData, flowErrorCode, formData, handleResetPassword]);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { emailInput, passwordInput, confirmPasswordInput } = evt.target as HTMLFormElement & {
      emailInput: HTMLInputElement;
      passwordInput: HTMLInputElement;
      confirmPasswordInput: HTMLInputElement;
    };

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (!email) {
      emailInput.focus();
      return;
    }
    if (password !== confirmPassword) return;

    const clientSecret = mx.generateClientSecret();
    passwordEmail(email, clientSecret);
    setFormData({
      email,
      password,
      clientSecret,
    });
  };

  const handleCancel = () => {
    window.location.reload();
  };

  const handleSubmitRequest = useCallback(
    (authDict: AuthDict) => {
      if (!formData) return;
      const { password } = formData;
      handleResetPassword(authDict, password);
    },
    [formData, handleResetPassword]
  );

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Inherit" gap="400">
      <Text size="T300" priority="400">
        Homeserver <strong>{server}</strong> will send you an email to let you reset your password.
      </Text>
      <Box direction="Column" gap="100">
        <Text as="label" size="L400" priority="300">
          Email
        </Text>
        <Input
          defaultValue={defaultEmail}
          type="email"
          name="emailInput"
          variant="Background"
          size="500"
          required
          outlined
        />
        {passwordEmailState.status === AsyncStatus.Error && (
          <FieldError
            message={`${passwordEmailState.error.errcode}: ${passwordEmailState.error.data?.error}`}
          />
        )}
      </Box>
      <ConfirmPasswordMatch initialValue>
        {(match, doMatch, passRef, confPassRef) => (
          <>
            <Box direction="Column" gap="100">
              <Text as="label" size="L400" priority="300">
                New Password
              </Text>
              <PasswordInput
                ref={passRef}
                onChange={doMatch}
                name="passwordInput"
                variant="Background"
                size="500"
                outlined
                required
              />
            </Box>
            <Box direction="Column" gap="100">
              <Text as="label" size="L400" priority="300">
                Confirm Password
              </Text>
              <PasswordInput
                ref={confPassRef}
                onChange={doMatch}
                name="confirmPasswordInput"
                variant="Background"
                size="500"
                style={{ color: match ? undefined : color.Critical.Main }}
                outlined
                required
              />
            </Box>
          </>
        )}
      </ConfirmPasswordMatch>
      {resetPasswordError && (
        <FieldError
          message={`${resetPasswordError.errcode}: ${
            resetPasswordError.data?.error ?? 'Failed to reset password.'
          }`}
        />
      )}
      <span data-spacing-node />
      <Button type="submit" variant="Primary" size="500">
        <Text as="span" size="B500">
          Reset Password
        </Text>
      </Button>

      {resetPasswordResult && <ResetPasswordComplete email={formData?.email} />}

      {passwordEmailState.status === AsyncStatus.Success && formData && waitingToVerifyEmail && (
        <UIAFlowOverlay currentStep={1} stepCount={1} onCancel={handleCancel}>
          <EmailStageDialog
            stageData={{
              type: AuthType.Email,
              errorCode: flowErrorCode,
              error: flowError,
              session: ongoingAuthData?.session,
            }}
            submitAuthDict={handleSubmitRequest}
            email={formData.email}
            clientSecret={formData.clientSecret}
            requestEmailToken={passwordEmail}
            emailTokenState={passwordEmailState}
            onCancel={handleCancel}
          />
        </UIAFlowOverlay>
      )}

      <Overlay
        open={
          passwordEmailState.status === AsyncStatus.Loading ||
          resetPasswordState.status === AsyncStatus.Loading
        }
        backdrop={<OverlayBackdrop />}
      >
        <OverlayCenter>
          <Spinner variant="Secondary" size="600" />
        </OverlayCenter>
      </Overlay>
    </Box>
  );
}
