import React, { FormEventHandler, useCallback } from 'react';
import { Box, Button, Spinner, Text, color } from 'folds';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { PasswordInput } from '../../../components/password-input';
import { ConfirmPasswordMatch } from '../../../components/ConfirmPasswordMatch';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAlive } from '../../../hooks/useAlive';
import { changePassword, changePasswordErrorMessage } from './changePassword';

type PasswordForm = HTMLFormElement & {
  currentPasswordInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  confirmPasswordInput: HTMLInputElement;
};

function ChangePassword() {
  const mx = useMatrixClient();
  const alive = useAlive();

  const [changeState, change] = useAsyncCallback<unknown, unknown, [string, string]>(
    useCallback(
      (currentPassword: string, newPassword: string) =>
        changePassword(mx, currentPassword, newPassword),
      [mx]
    )
  );
  const changing = changeState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (changing) return;

    const form = evt.currentTarget as PasswordForm;
    const currentPassword = form.currentPasswordInput.value;
    const newPassword = form.passwordInput.value;
    if (!currentPassword || !newPassword) return;
    if (newPassword !== form.confirmPasswordInput.value) return;

    // A failure is shown from changeState.
    change(currentPassword, newPassword)
      .then(() => {
        if (alive()) form.reset();
      })
      .catch(() => undefined);
  };

  return (
    <SettingTile
      title={
        <Text as="span" size="L400">
          Change Password
        </Text>
      }
      description="Other devices stay signed in."
    >
      <Box as="form" onSubmit={handleSubmit} direction="Column" gap="200">
        <Box direction="Column" gap="100">
          <Text size="L400">Current Password</Text>
          <PasswordInput
            name="currentPasswordInput"
            autoComplete="current-password"
            size="400"
            variant="Secondary"
            radii="300"
            required
            readOnly={changing}
          />
        </Box>
        <ConfirmPasswordMatch initialValue>
          {(match, doMatch, passRef, confPassRef) => (
            <>
              <Box direction="Column" gap="100">
                <Text size="L400">New Password</Text>
                <PasswordInput
                  ref={passRef}
                  name="passwordInput"
                  autoComplete="new-password"
                  size="400"
                  variant="Secondary"
                  radii="300"
                  required
                  onChange={doMatch}
                  readOnly={changing}
                />
              </Box>
              <Box direction="Column" gap="100">
                <Text size="L400">Confirm New Password</Text>
                <PasswordInput
                  ref={confPassRef}
                  style={{ color: match ? undefined : color.Critical.Main }}
                  name="confirmPasswordInput"
                  autoComplete="new-password"
                  size="400"
                  variant="Secondary"
                  radii="300"
                  required
                  onChange={doMatch}
                  readOnly={changing}
                />
              </Box>
            </>
          )}
        </ConfirmPasswordMatch>
        <Box gap="200" alignItems="Center">
          <Button
            type="submit"
            size="400"
            variant="Success"
            fill="Solid"
            radii="300"
            disabled={changing}
            before={changing ? <Spinner size="200" variant="Success" fill="Solid" /> : undefined}
          >
            <Text as="span" size="B400">
              Change Password
            </Text>
          </Button>
          {changeState.status === AsyncStatus.Success && (
            <Text size="T200" style={{ color: color.Success.Main }}>
              Password changed.
            </Text>
          )}
        </Box>
        {changeState.status === AsyncStatus.Error && (
          <Text size="T200" style={{ color: color.Critical.Main }}>
            <b>{changePasswordErrorMessage(changeState.error)}</b>
          </Text>
        )}
      </Box>
    </SettingTile>
  );
}

export function Password() {
  const capabilities = useCapabilities();
  if (capabilities['m.change_password']?.enabled === false) return null;

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Password</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <ChangePassword />
      </SequenceCard>
    </Box>
  );
}
