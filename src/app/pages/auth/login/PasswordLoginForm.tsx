import React, { FormEventHandler, MouseEventHandler, useCallback, useState } from 'react';
import {
  Box,
  Button,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Menu,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  PopOut,
  RectCords,
  Spinner,
  Text,
  config,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { Link } from 'react-router-dom';
import { MatrixError } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';
import { getMxIdLocalPart, getMxIdServer, isUserId } from '../../../utils/matrix';
import { EMAIL_REGEX } from '../../../utils/regex';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { useClientConfig } from '../../../hooks/useClientConfig';
import {
  CustomLoginResponse,
  LoginError,
  factoryGetBaseUrl,
  login,
  useLoginComplete,
} from './loginUtil';
import { PasswordInput } from '../../../components/password-input';
import { FieldError } from '../FiledError';
import { getResetPasswordPath } from '../../pathUtils';
import { stopPropagation } from '../../../utils/keyboard';

function UsernameHint({ server }: { server: string }) {
  const { t } = useTranslation('auth');
  const [anchor, setAnchor] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLElement> = (evt) => {
    setAnchor(evt.currentTarget.getBoundingClientRect());
  };
  return (
    <PopOut
      anchor={anchor}
      position="Top"
      align="End"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setAnchor(undefined),
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu>
            <Header size="300" style={{ padding: `0 ${config.space.S200}` }}>
              <Text size="L400">{t('hintTitle', { defaultValue: 'Hint' })}</Text>
            </Header>
            <Box
              style={{ padding: config.space.S200, paddingTop: 0 }}
              direction="Column"
              tabIndex={0}
              gap="100"
            >
              <Text size="T300">
                <Text as="span" size="Inherit" priority="300">
                  {t('hintUsernameLabel', { defaultValue: 'Username:' })}
                </Text>{' '}
                user123
              </Text>
              <Text size="T300">
                <Text as="span" size="Inherit" priority="300">
                  {t('hintMatrixIdLabel', { defaultValue: 'Matrix ID:' })}
                </Text>
                {` @user123:${server}`}
              </Text>
              <Text size="T300">
                <Text as="span" size="Inherit" priority="300">
                  {t('hintEmailLabel', { defaultValue: 'Email:' })}
                </Text>
                {` user123@${server}`}
              </Text>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      <IconButton
        tabIndex={-1}
        onClick={handleOpenMenu}
        type="button"
        variant="Background"
        size="300"
        radii="300"
        aria-pressed={!!anchor}
      >
        <Icon style={{ opacity: config.opacity.P300 }} size="100" src={Icons.Info} />
      </IconButton>
    </PopOut>
  );
}

type PasswordLoginFormProps = {
  defaultUsername?: string;
  defaultEmail?: string;
};
export function PasswordLoginForm({ defaultUsername, defaultEmail }: PasswordLoginFormProps) {
  const { t } = useTranslation('auth');
  const server = useAuthServer();
  const clientConfig = useClientConfig();

  const serverDiscovery = useAutoDiscoveryInfo();
  const baseUrl = serverDiscovery['m.homeserver'].base_url;

  const [loginState, startLogin] = useAsyncCallback<
    CustomLoginResponse,
    MatrixError,
    Parameters<typeof login>
  >(useCallback(login, []));

  useLoginComplete(loginState.status === AsyncStatus.Success ? loginState.data : undefined);

  const handleUsernameLogin = (username: string, password: string) => {
    startLogin(baseUrl, {
      type: 'm.login.password',
      identifier: {
        type: 'm.id.user',
        user: username,
      },
      password,
      initial_device_display_name: 'Cinny Web',
    });
  };

  const handleMxIdLogin = async (mxId: string, password: string) => {
    const mxIdServer = getMxIdServer(mxId);
    const mxIdUsername = getMxIdLocalPart(mxId);
    if (!mxIdServer || !mxIdUsername) return;

    const getBaseUrl = factoryGetBaseUrl(clientConfig, mxIdServer);

    startLogin(getBaseUrl, {
      type: 'm.login.password',
      identifier: {
        type: 'm.id.user',
        user: mxIdUsername,
      },
      password,
      initial_device_display_name: 'Cinny Web',
    });
  };
  const handleEmailLogin = (email: string, password: string) => {
    startLogin(baseUrl, {
      type: 'm.login.password',
      identifier: {
        type: 'm.id.thirdparty',
        medium: 'email',
        address: email,
      },
      password,
      initial_device_display_name: 'Cinny Web',
    });
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { usernameInput, passwordInput } = evt.target as HTMLFormElement & {
      usernameInput: HTMLInputElement;
      passwordInput: HTMLInputElement;
    };

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username) {
      usernameInput.focus();
      return;
    }
    if (!password) {
      passwordInput.focus();
      return;
    }

    if (isUserId(username)) {
      handleMxIdLogin(username, password);
      return;
    }
    if (EMAIL_REGEX.test(username)) {
      handleEmailLogin(username, password);
      return;
    }
    handleUsernameLogin(username, password);
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Inherit" gap="400">
      <Box direction="Column" gap="100">
        <Text as="label" size="L400" priority="300">
          {t('usernameLabel', { defaultValue: 'Username' })}
        </Text>
        <Input
          defaultValue={defaultUsername ?? defaultEmail}
          style={{ paddingRight: config.space.S300 }}
          name="usernameInput"
          variant="Background"
          size="500"
          required
          outlined
          after={<UsernameHint server={server} />}
        />
        {loginState.status === AsyncStatus.Error && (
          <>
            {loginState.error.errcode === LoginError.ServerNotAllowed && (
              <FieldError
                message={t('loginCustomServerNotAllowed', {
                  defaultValue:
                    'Login with custom server not allowed by your client instance.',
                })}
              />
            )}
            {loginState.error.errcode === LoginError.InvalidServer && (
              <FieldError
                message={t('failedToFindMatrixIdServer', {
                  defaultValue: 'Failed to find your Matrix ID server.',
                })}
              />
            )}
          </>
        )}
      </Box>
      <Box direction="Column" gap="100">
        <Text as="label" size="L400" priority="300">
          {t('passwordLabel', { defaultValue: 'Password' })}
        </Text>
        <PasswordInput name="passwordInput" variant="Background" size="500" outlined required />
        <Box alignItems="Start" justifyContent="SpaceBetween" gap="200">
          {loginState.status === AsyncStatus.Error && (
            <>
              {loginState.error.errcode === LoginError.Forbidden && (
                <FieldError
                  message={t('invalidUsernameOrPassword', {
                    defaultValue: 'Invalid Username or Password.',
                  })}
                />
              )}
              {loginState.error.errcode === LoginError.UserDeactivated && (
                <FieldError
                  message={t('accountDeactivated', {
                    defaultValue: 'This account has been deactivated.',
                  })}
                />
              )}
              {loginState.error.errcode === LoginError.InvalidRequest && (
                <FieldError
                  message={t('failedToLoginInvalidRequest', {
                    defaultValue: 'Failed to login. Part of your request data is invalid.',
                  })}
                />
              )}
              {loginState.error.errcode === LoginError.RateLimited && (
                <FieldError
                  message={t('failedToLoginRateLimited', {
                    defaultValue:
                      'Failed to login. Your login request has been rate-limited by server, Please try after some time.',
                  })}
                />
              )}
              {loginState.error.errcode === LoginError.Unknown && (
                <FieldError
                  message={t('failedToLoginUnknown', {
                    defaultValue: 'Failed to login. Unknown reason.',
                  })}
                />
              )}
            </>
          )}
          <Box grow="Yes" shrink="No" justifyContent="End">
            <Text as="span" size="T200" priority="400" align="Right">
              <Link to={getResetPasswordPath(server)}>
                {t('forgotPasswordLink', { defaultValue: 'Forget Password?' })}
              </Link>
            </Text>
          </Box>
        </Box>
      </Box>
      <Button type="submit" variant="Primary" size="500">
        <Text as="span" size="B500">
          {t('loginButton', { defaultValue: 'Login' })}
        </Text>
      </Button>

      <Overlay
        open={
          loginState.status === AsyncStatus.Loading || loginState.status === AsyncStatus.Success
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
