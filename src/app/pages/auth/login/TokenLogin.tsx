import {
  Box,
  Icon,
  Icons,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  color,
  config,
} from 'folds';
import React, { useCallback, useEffect } from 'react';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { LoginError, login, useLoginComplete } from './loginUtil';
import { getInitialDeviceDisplayName } from '../../../utils/user-agent';

function LoginTokenError({ message }: { message: string }) {
  return (
    <Box
      style={{
        backgroundColor: color.Critical.Container,
        color: color.Critical.OnContainer,
        padding: config.space.S300,
        borderRadius: config.radii.R400,
      }}
      justifyContent="Start"
      alignItems="Start"
      gap="300"
    >
      <Icon size="300" filled src={Icons.Warning} />
      <Box direction="Column" gap="100">
        <Text size="L400">Token Login</Text>
        <Text size="T300">
          <b>{message}</b>
        </Text>
      </Box>
    </Box>
  );
}

type TokenLoginProps = {
  token: string;
};
export function TokenLogin({ token }: TokenLoginProps) {
  const discovery = useAutoDiscoveryInfo();
  const baseUrl = discovery['m.homeserver'].base_url;

  const [loginState, startLogin] = useAsyncCallback(useCallback(login, []));

  const handleLoginComplete = useLoginComplete();

  useEffect(() => {
    startLogin(baseUrl, {
      type: 'm.login.token',
      token,
      initial_device_display_name: getInitialDeviceDisplayName(),
    }).then(([, data]) => {
      if (data) handleLoginComplete(data);
    });
  }, [baseUrl, token, startLogin, handleLoginComplete]);

  const [loginError] = loginState.status === AsyncStatus.Success ? loginState.data : [];

  return (
    <>
      {loginError && (
        <>
          {loginError === LoginError.Forbidden && (
            <LoginTokenError message="Invalid login token." />
          )}
          {loginError === LoginError.UserDeactivated && (
            <LoginTokenError message="This account has been deactivated." />
          )}
          {loginError === LoginError.InvalidRequest && (
            <LoginTokenError message="Failed to login. Part of your request data is invalid." />
          )}
          {loginError === LoginError.RateLimited && (
            <LoginTokenError message="Failed to login. Your login request has been rate-limited by server, Please try after some time." />
          )}
          {loginError === LoginError.Unknown && (
            <LoginTokenError message="Failed to login. Unknown reason." />
          )}
        </>
      )}
      {loginState.status === AsyncStatus.Error && (
        <LoginTokenError
          message={
            loginState.error instanceof Error
              ? loginState.error.message
              : 'Your request to login has been failed for unknown reasons.'
          }
        />
      )}
      <Overlay
        open={loginState.status !== AsyncStatus.Error && !loginError}
        backdrop={<OverlayBackdrop />}
      >
        <OverlayCenter>
          <Spinner size="600" variant="Secondary" />
        </OverlayCenter>
      </Overlay>
    </>
  );
}
