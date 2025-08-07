import React, { FormEventHandler, useCallback, useState, useEffect } from 'react';
import {
  Box,
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
import AuthDict from 'matrix-js-sdk';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { PasswordInput } from '../../../components/password-input';
import { ConfirmPasswordMatch } from '../../../components/ConfirmPasswordMatch';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { ActionUIA, ActionUIAFlowsLoader } from '../../../components/ActionUIA';
import { changePassword, ChangePasswordResult } from '../../../utils/changePassword';
import { useCapabilities } from '../../../hooks/useCapabilities';

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

type ChangePasswordFormProps = {
  onCancel: () => void;
  onSuccess: () => void;
};

function ChangePasswordForm({ onCancel, onSuccess }: ChangePasswordFormProps) {
  const mx = useMatrixClient();
  const [formData, setFormData] = useState<{ newPassword: string; logoutDevices: boolean } | null>(
    null
  );

  const [changePasswordState, handleChangePassword] = useAsyncCallback<
    ChangePasswordResult,
    Error,
    [AuthDict | undefined, string, boolean]
  >(
    useCallback(
      async (authDict, newPassword, logoutDevices) =>
        changePassword(mx, authDict, newPassword, logoutDevices),
      [mx]
    )
  );

  const [ongoingAuthData, changePasswordResult] =
    changePasswordState.status === AsyncStatus.Success
      ? changePasswordState.data
      : [undefined, undefined];

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();

    const formDataObj = new FormData(evt.currentTarget);
    const newPassword = formDataObj.get('newPassword') as string;
    const confirmPassword = formDataObj.get('confirmPassword') as string;
    const logoutDevices = formDataObj.get('logoutDevices') === 'on';

    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) return;

    // Store form data for UIA completion
    const formState = { newPassword, logoutDevices };
    setFormData(formState);

    // Just call the async callback - don't handle the result here
    // The component state will automatically update and handle UIA vs success
    handleChangePassword(undefined, newPassword, logoutDevices);
  };

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
                handleChangePassword(authDict, formData.newPassword, formData.logoutDevices);
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
  const error =
    changePasswordState.status === AsyncStatus.Error ? changePasswordState.error : undefined;

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
                  Enter your new password. You may need to re-verify your other devices after
                  changing your password.
                </Text>

                <ConfirmPasswordMatch initialValue>
                  {(match, doMatch, passRef, confPassRef) => (
                    <>
                      <Box direction="Column" gap="100">
                        <Text size="L400">New Password</Text>
                        <PasswordInput
                          ref={passRef}
                          onChange={doMatch}
                          name="newPassword"
                          size="400"
                          outlined
                          required
                          autoFocus
                        />
                      </Box>
                      <Box direction="Column" gap="100">
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
                    </>
                  )}
                </ConfirmPasswordMatch>

                <Box direction="Column" gap="100">
                  <Box alignItems="Center" gap="200">
                    <input type="checkbox" id="logoutDevices" name="logoutDevices" defaultChecked />
                    <Text as="label" htmlFor="logoutDevices" size="T300">
                      Sign out all other devices
                    </Text>
                  </Box>
                  <Text size="T200" priority="300">
                    Recommended for security. Unchecking this may leave your other devices logged
                    in.
                  </Text>
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
                <Button type="button" variant="Secondary" onClick={onCancel} disabled={isLoading}>
                  <Text as="span" size="B400">
                    Cancel
                  </Text>
                </Button>
                <Button variant="Primary" type="submit" disabled={isLoading}>
                  {isLoading && <Spinner variant="Primary" size="300" />}
                  <Text as="span" size="B400">
                    Change Password
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

  return (
    <>
      <Box direction="Column" gap="100">
        <Text size="L400">Password</Text>
        <SequenceCard
          className={SequenceCardStyle}
          variant="SurfaceVariant"
          direction="Column"
          gap="400"
        >
          <SettingTile
            title="Change Password"
            description={
              disableChangePassword
                ? 'Password changes are disabled by your server administrator.'
                : 'Change your account password. This will require authentication with your current password.'
            }
            after={
              <Button
                variant="Secondary"
                size="400"
                outlined
                radii="300"
                onClick={handleOpenDialog}
                disabled={disableChangePassword}
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
