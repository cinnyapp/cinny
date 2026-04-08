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
import { MatrixError } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { CustomLoginResponse, LoginError, login, useLoginComplete } from './loginUtil';

function LoginTokenError({ message }: { message: string }) {
  const { t } = useTranslation('auth');
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
        <Text size="L400">{t('tokenLoginTitle', { defaultValue: 'Token Login' })}</Text>
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
  const { t } = useTranslation('auth');
  const discovery = useAutoDiscoveryInfo();
  const baseUrl = discovery['m.homeserver'].base_url;

  const [loginState, startLogin] = useAsyncCallback<
    CustomLoginResponse,
    MatrixError,
    Parameters<typeof login>
  >(useCallback(login, []));

  useEffect(() => {
    startLogin(baseUrl, {
      type: 'm.login.token',
      token,
      initial_device_display_name: 'Cinny Web',
    });
  }, [baseUrl, token, startLogin]);

  useLoginComplete(loginState.status === AsyncStatus.Success ? loginState.data : undefined);

  return (
    <>
      {loginState.status === AsyncStatus.Error && (
        <>
          {loginState.error.errcode === LoginError.Forbidden && (
            <LoginTokenError
              message={t('invalidLoginToken', { defaultValue: 'Invalid login token.' })}
            />
          )}
          {loginState.error.errcode === LoginError.UserDeactivated && (
            <LoginTokenError
              message={t('accountDeactivated', {
                defaultValue: 'This account has been deactivated.',
              })}
            />
          )}
          {loginState.error.errcode === LoginError.InvalidRequest && (
            <LoginTokenError
              message={t('failedToLoginInvalidRequest', {
                defaultValue: 'Failed to login. Part of your request data is invalid.',
              })}
            />
          )}
          {loginState.error.errcode === LoginError.RateLimited && (
            <LoginTokenError
              message={t('failedToLoginRateLimited', {
                defaultValue:
                  'Failed to login. Your login request has been rate-limited by server, Please try after some time.',
              })}
            />
          )}
          {loginState.error.errcode === LoginError.Unknown && (
            <LoginTokenError
              message={t('failedToLoginUnknown', {
                defaultValue: 'Failed to login. Unknown reason.',
              })}
            />
          )}
        </>
      )}
      <Overlay open={loginState.status !== AsyncStatus.Error} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <Spinner size="600" variant="Secondary" />
        </OverlayCenter>
      </Overlay>
    </>
  );
}
