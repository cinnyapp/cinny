import { Box, Button, color, config, Dialog, Header, Icon, IconButton, Icons, Text } from 'folds';
import React, { FormEventHandler } from 'react';
import { StageComponentProps } from './types';
import { ErrorCode } from '../../cs-errorcode';
import { PasswordInput } from '../password-input';
import { AuthType } from '../../utils/matrix-uia';

export function PasswordStage({
  stageData,
  submitAuthDict,
  onCancel,
  userId,
}: StageComponentProps & {
  userId: string;
}) {
  const { errorCode, error, session } = stageData;

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { passwordInput } = evt.target as HTMLFormElement & {
      passwordInput: HTMLInputElement;
    };
    const password = passwordInput.value;
    if (!password) return;
    submitAuthDict({
      type: AuthType.Password,
      identifier: {
        type: 'm.id.user',
        user: userId,
      },
      password,
      session,
    });
  };

  return (
    <Dialog>
      <Header
        style={{
          padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
        }}
        variant="Surface"
        size="500"
      >
        <Box grow="Yes">
          <Text size="H4">Account Password</Text>
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
            To perform this action you need to authenticate yourself by entering you account
            password.
          </Text>
          <Box direction="Column" gap="100">
            <Text size="L400">Password</Text>
            <PasswordInput size="400" name="passwordInput" outlined autoFocus required />
            {errorCode && (
              <Box alignItems="Center" gap="100" style={{ color: color.Critical.Main }}>
                <Icon size="50" src={Icons.Warning} filled />
                <Text size="T200">
                  <b>
                    {errorCode === ErrorCode.M_FORBIDDEN
                      ? 'Invalid Password!'
                      : `${errorCode}: ${error}`}
                  </b>
                </Text>
              </Box>
            )}
          </Box>
        </Box>
        <Button variant="Primary" type="submit">
          <Text as="span" size="B400">
            Continue
          </Text>
        </Button>
      </Box>
    </Dialog>
  );
}
