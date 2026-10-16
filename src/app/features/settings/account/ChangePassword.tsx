import to from 'await-to-js';
import React, { FormEventHandler, useCallback, useState, useEffect } from 'react';
import {
  Box,
  Checkbox,
  Text,
  Button,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  config,
  Spinner,
  color,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { PasswordDict, IAuthData, MatrixClient, MatrixError } from 'matrix-js-sdk';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { PasswordInput } from '../../../components/password-input';
import { ConfirmPasswordMatch } from '../../../components/ConfirmPasswordMatch';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { ActionUIA, ActionUIAFlowsLoader } from '../../../components/ActionUIA';
import { useCapabilities } from '../../../hooks/useCapabilities';

type ChangePasswordResponse = Record<string, never>;
type ChangePasswordResult = [IAuthData, undefined] | [undefined, ChangePasswordResponse];
type ChangePasswordFormProps = {
  onCancel: () => void;
  onSuccess: () => void;
};

type ChangePasswordData = {
  newPassword: string;
  logoutDevices: boolean;
};

export function ChangePassword() {
  const [showDialog, setShowDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const capabilities = useCapabilities();

  // Check if password change is disabled by server capabilities
  const disableChangePassword = capabilities['m.change_password']?.enabled === false;

  const handleOpenDialog = () => setShowDialog(true);
  const handleCloseDialog = () => {
    setShowDialog(false);
    setShowSuccess(false);
  };
  const handleSuccess = () => {
    setShowDialog(false);
    setShowSuccess(true);
  };

  if (disableChangePassword) {
    return (
      <>
        <Box direction="Column" gap="100">
          <Text size="L400">Account Security</Text>
          <SequenceCard
            className={SequenceCardStyle}
            variant="SurfaceVariant"
            direction="Column"
            gap="400"
          >
            <SettingTile
              title="Password"
              description="Contact your homeserver's administrator to change your password."
              after={
                <Button
                  size="400"
                  variant="Secondary"
                  fill="Soft"
                  outlined
                  radii="300"
                  disabled="True"
                >
                  <Text size="B400">Change</Text>
                </Button>
              }
            />
          </SequenceCard>
        </Box>
      </>
    );
  }

  return (
    <>
      <Box direction="Column" gap="100">
        <Text size="L400">Account Security</Text>
        <SequenceCard
          className={SequenceCardStyle}
          variant="SurfaceVariant"
          direction="Column"
          gap="400"
        >
          <SettingTile
            title="Password"
            description="Credentials used to sign into your account"
            after={
              <Button
                size="400"
                variant="Secondary"
                fill="Soft"
                outlined
                radii="300"
                onClick={handleOpenDialog}
              >
                <Text size="B400">Change</Text>
              </Button>
            }
          />
        </SequenceCard>
      </Box>

      {showDialog && <ChangePasswordForm onCancel={handleCloseDialog} onSuccess={handleSuccess} />}
      {showSuccess && <ChangePasswordSuccess onClose={handleCloseDialog} />}
    </>
  );
}

function ChangePasswordForm({ onCancel, onSuccess }: ChangePasswordFormProps) {
  const mx = useMatrixClient();
  const [formData, setFormData] = useState<ChangePasswordData | null>(null);

  const [changePasswordState, attemptPasswordChange] = useAsyncCallback<
    ChangePasswordResult,
    Error,
    [AuthDict | null, string, boolean]
  >(
    useCallback(async (authDict, newPassword, logoutDevices) => {
      // For the initial request, pass undefined instead of null
      // This ensures the auth field is omitted from the request body
      const [err, res] = await to<ChangePasswordResponse, MatrixError>(
        mx.setPassword(authDict, newPassword, logoutDevices)
      );

      if (err) {
        console.error('Password change error:', err.httpStatus, err.data);
        // If we get a 401, it means we need to perform UIA
        if (err.httpStatus === 401) {
          const authData = err.data as IAuthData;
          return [authData, undefined];
        }
        // Any other error should be thrown
        throw err;
      }

      return [undefined, res];
    }, [mx])
  );

  const [ongoingAuthData, changePasswordResult] =
    changePasswordState.status === AsyncStatus.Success
      ? changePasswordState.data
      : [undefined, undefined];

  // Handle successful completion
  useEffect(() => {
    if (changePasswordResult && !ongoingAuthData) {
      onSuccess();
    }
  }, [changePasswordResult, ongoingAuthData, onSuccess]);

  // Don't show success dialog in this component - let parent handle it
  if (changePasswordResult && !ongoingAuthData) {
    return null; // Success state handled by parent component
  }

  // Show UIA flow if we have auth data
  if (ongoingAuthData) {
    return (
      <ActionUIAFlowsLoader
        authData={ongoingAuthData}
        unsupported={() => (
          <Overlay open backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
              <FocusTrap>
                <Dialog>
                  <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                    <Text>
                      This server requires authentication methods that are not supported by this
                      client.
                    </Text>
                    <Button variant="Primary" onClick={onCancel}>
                      <Text size="B400" as="span">
                        Close
                      </Text>
                    </Button>
                  </Box>
                </Dialog>
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        )}
      >
        {(ongoingFlow) => (
          <ActionUIA
            authData={ongoingAuthData}
            ongoingFlow={ongoingFlow}
            action={(authDict) => {
              if (formData) {
                attemptPasswordChange(authDict, formData.newPassword, formData.logoutDevices);
              } else {
                onCancel();
              }
            }}
            onCancel={onCancel}
          />
        )}
      </ActionUIAFlowsLoader>
    );
  }

  const isLoading = changePasswordState.status === AsyncStatus.Loading;
  const error = changePasswordState.status === AsyncStatus.Error ? changePasswordState.error : undefined;
  const handleFormSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();

    const formDataObj = new FormData(evt.currentTarget);
    const newPassword = formDataObj.get('newPassword') as string;
    const confirmPassword = formDataObj.get('confirmPassword') as string;
    const logoutDevices = formDataObj.get('logoutDevices') === 'on';

    if (!newPassword || !confirmPassword || newPassword !== confirmPassword) {
      return;
    }

    // Store form data for UIA completion
    setFormData({ newPassword, logoutDevices });

    // Try to set password without authentication.
    // Response will contain authData for UIA to proceed.
    // TODO: is there ANY way to do UIA before asking the user for their new password?
    attemptPasswordChange(null, newPassword, logoutDevices);
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap>
          <Dialog>
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">Change Password</Text>
              </Box>
              <IconButton size="300" onClick={onCancel} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box
              as="form"
              onSubmit={handleFormSubmit}
              style={{ padding: `0 ${config.space.S400} ${config.space.S400}` }}
              direction="Column"
              gap="400"
            >
              <Box direction="Column" gap="400">
                <Text size="T200">
                  Enter your current password and a new password.
                </Text>

                <ConfirmPasswordMatch initialValue>
                  {(match, doMatch, passRef, confPassRef) => (
                    <Box direction="Column" gap="100">
                      <Text size="L400">New Password</Text>
                      <PasswordInput
                        ref={passRef}
                        onChange={doMatch}
                        name="newPassword"
                        size="400"
                        outlined
                        required
                      />
                      <Text size="L400">Confirm New Password</Text>
                      <PasswordInput
                        ref={confPassRef}
                        onChange={doMatch}
                        name="confirmPassword"
                        size="400"
                        style={{ color: match ? undefined : color.Critical.Main }}
                        outlined
                        required
                      />
                    </Box>
                  )}
                </ConfirmPasswordMatch>

                <Box direction="Column" gap="100">
                  <Box alignItems="Center" gap="200">
                    <Checkbox id="logoutDevices" name="logoutDevices" defaultChecked />
                    <Text as="label" size="T300">
                      Logout other devices
                    </Text>
                  </Box>
                </Box>

                {error && (
                  <Box alignItems="Center" gap="100" style={{ color: color.Critical.Main }}>
                    <Icon size="50" src={Icons.Warning} filled />
                    <Text size="T200">
                      <b>Failed to change password: {error.message}</b>
                    </Text>
                  </Box>
                )}
              </Box>

              <Box gap="200" justifyContent="End">
                <Button variant="Primary" type="submit" disabled={isLoading}>
                  {isLoading && <Spinner variant="Primary" size="300" />}
                  <Text as="span" size="B400">
                    Submit
                  </Text>
                </Button>
              </Box>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

function ChangePasswordSuccess({ onClose }: { onClose: () => void }) {
  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap>
          <Dialog>
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">Password Changed</Text>
              </Box>
              <IconButton size="300" onClick={onClose} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box
              style={{ padding: `0 ${config.space.S400} ${config.space.S400}` }}
              direction="Column"
              gap="400"
            >
              <Box direction="Column" gap="400">
                <Text size="T200">
                  Your password has been successfully changed. Your other devices may need to be
                  re-verified.
                </Text>
              </Box>
              <Button variant="Primary" onClick={onClose}>
                <Text as="span" size="B400">
                  Continue
                </Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
