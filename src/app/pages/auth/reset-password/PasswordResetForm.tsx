import React, { FormEventHandler, useCallback, useEffect, useState } from 'react';
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
import { printMatrixError } from 'neurone/lib/matrix-request';
import { PostPasswordBody } from 'neurone/lib/api/matrix/client/v3/account';
import { useNavigate } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { usePasswordEmail } from '../../../hooks/usePasswordEmail';
import { PasswordInput } from '../../../components/password-input';
import { ConfirmPasswordMatch } from '../../../components/ConfirmPasswordMatch';
import { FieldError } from '../FiledError';
import { UIAFlowOverlay } from '../../../components/UIAFlowOverlay';
import { EmailStageDialog } from '../../../components/uia-stages';
import { ResetPasswordResult, resetPassword } from './resetPasswordUtil';
import { getLoginPath, withSearchParam } from '../../pathUtils';
import { LoginPathSearchParams } from '../../paths';
import { AuthType, getUIAError, getUIAErrorCode } from '../../../utils/matrix-uia';
import { generateClientSecret } from '../../../utils/randomString';

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

  const [formData, setFormData] = useState<FormData>();

  const [passwordEmailState, passwordEmail] = usePasswordEmail(baseUrl);
  const [passwordEmailError] =
    passwordEmailState.status === AsyncStatus.Success ? passwordEmailState.data : [];
  const passwordEmailRequestError =
    passwordEmailState.status === AsyncStatus.Error ? passwordEmailState.error : undefined;

  const [resetPasswordState, handleResetPassword] = useAsyncCallback<
    ResetPasswordResult,
    Error,
    [PostPasswordBody]
  >(useCallback(async (requestData) => resetPassword(baseUrl, requestData), [baseUrl]));

  const [ongoingAuthData, resetPasswordError, resetPasswordResult] =
    resetPasswordState.status === AsyncStatus.Success ? resetPasswordState.data : [];
  const resetPasswordRequestError =
    resetPasswordState.status === AsyncStatus.Error ? resetPasswordState.error : undefined;

  const flowErrorCode = ongoingAuthData && getUIAErrorCode(ongoingAuthData);
  const flowError = ongoingAuthData && getUIAError(ongoingAuthData);

  let waitingToVerifyEmail = true;
  if (resetPasswordResult) waitingToVerifyEmail = false;
  if (ongoingAuthData && flowErrorCode === undefined) waitingToVerifyEmail = false;
  if (resetPasswordError || resetPasswordRequestError) waitingToVerifyEmail = false;
  if (resetPasswordState.status === AsyncStatus.Loading) waitingToVerifyEmail = false;

  // We only support UIA m.login.password stage for reset password
  // So we will assume to process it as soon as
  // we have 401 with no error on initial request.
  useEffect(() => {
    if (formData && ongoingAuthData && !flowErrorCode) {
      handleResetPassword({
        auth: {
          type: AuthType.Password,
          identifier: {
            type: 'm.id.thirdparty',
            medium: 'email',
            address: formData.email,
          },
        },
        new_password: formData.password,
        logout_devices: false,
      });
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

    const clientSecret = generateClientSecret();
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
    (authDict: object) => {
      if (!formData) return;
      const { password } = formData;
      handleResetPassword({
        auth: authDict,
        new_password: password,
        logout_devices: false,
      });
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
        {passwordEmailRequestError && <FieldError message={passwordEmailRequestError.message} />}
        {passwordEmailError && <FieldError message={printMatrixError(passwordEmailError)} />}
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
      {resetPasswordError && <FieldError message={printMatrixError(resetPasswordError)} />}
      {resetPasswordRequestError && (
        <FieldError message={resetPasswordRequestError.message ?? 'Failed to reset password.'} />
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
