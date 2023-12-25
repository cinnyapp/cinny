import React, { FormEventHandler, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Menu,
  PopOut,
  Text,
  color,
  config,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import to from 'await-to-js';
import { Link, generatePath } from 'react-router-dom';
import { LoginRequest, LoginResponse, MatrixError, createClient } from 'matrix-js-sdk';
import { UseStateProvider } from '../../components/UseStateProvider';
import { getMxIdLocalPart, getMxIdServer, isUserId } from '../../utils/matrix';
import { EMAIL_REGEX } from '../../utils/regex';
import { useAutoDiscoveryInfo } from '../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { autoDiscovery, specVersions } from '../../cs-api';
import { REGISTER_PATH } from '../paths';
import { useAuthServer } from '../../hooks/useAuthServer';

function UsernameHint({ server }: { server: string }) {
  const [open, setOpen] = useState(false);
  return (
    <PopOut
      open={open}
      position="Top"
      align="End"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setOpen(false),
            clickOutsideDeactivates: true,
          }}
        >
          <Menu>
            <Header size="300" style={{ padding: `0 ${config.space.S200}` }}>
              <Text size="L400">Hint</Text>
            </Header>
            <Box
              style={{ padding: config.space.S200, paddingTop: 0 }}
              direction="Column"
              tabIndex={0}
              gap="100"
            >
              <Text size="T300">
                <Text as="span" size="Inherit" priority="300">
                  Username:
                </Text>{' '}
                johndoe
              </Text>
              <Text size="T300">
                <Text as="span" size="Inherit" priority="300">
                  Matrix ID:
                </Text>
                {` @johndoe:${server}`}
              </Text>
              <Text size="T300">
                <Text as="span" size="Inherit" priority="300">
                  Email:
                </Text>
                {` johndoe@${server}`}
              </Text>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      {(targetRef) => (
        <IconButton
          tabIndex={-1}
          onClick={() => setOpen(true)}
          ref={targetRef}
          type="button"
          variant="Background"
          size="400"
          radii="300"
        >
          <Icon style={{ opacity: config.opacity.P300 }} size="100" src={Icons.Info} />
        </IconButton>
      )}
    </PopOut>
  );
}

function LoginFieldError({ message }: { message: string }) {
  return (
    <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="100">
      <Icon size="50" filled src={Icons.Warning} />
      <Text size="T200">
        <b>{message}</b>
      </Text>
    </Box>
  );
}

const factoryFetchBaseUrl = (server: string) => {
  const fetchBaseUrl = async (): Promise<string> => {
    const [, discovery] = await to(autoDiscovery(fetch, server));

    let mxIdBaseUrl: string | undefined;
    const [, discoveryInfo] = discovery ?? [];

    if (discoveryInfo) {
      mxIdBaseUrl = discoveryInfo['m.homeserver'].base_url;
    }

    if (!mxIdBaseUrl) {
      throw new Error(
        'Failed to find MXID homeserver! Please enter server in Homeserver input for more details.'
      );
    }
    const [, versions] = await to(specVersions(fetch, mxIdBaseUrl));
    if (!versions) {
      throw new Error('Homeserver URL does not appear to be a valid Matrix homeserver.');
    }
    return mxIdBaseUrl;
  };
  return fetchBaseUrl;
};

enum LoginError {
  InvalidServer = 'InvalidServer',
  Forbidden = 'Forbidden',
  UserDeactivated = 'UserDeactivated',
  InvalidRequest = 'InvalidRequest',
  RateLimited = 'RateLimited',
  Unknown = 'Unknown',
}

const passwordLogin = async (
  serverBaseUrl: string | (() => Promise<string>),
  data: Omit<LoginRequest, 'type'>
) => {
  const [urlError, url] =
    typeof serverBaseUrl === 'function' ? await to(serverBaseUrl()) : [undefined, serverBaseUrl];
  if (urlError) {
    throw new MatrixError({
      errcode: LoginError.InvalidServer,
    });
  }

  const mx = createClient({ baseUrl: url });
  const [err, res] = await to<LoginResponse, MatrixError>(mx.login('m.login.password', data));

  if (err) {
    if (err.httpStatus === 400) {
      throw new MatrixError({
        errcode: LoginError.InvalidRequest,
      });
    }
    if (err.httpStatus === 429) {
      throw new MatrixError({
        errcode: LoginError.RateLimited,
      });
    }
    if (err.errcode === 'M_USER_DEACTIVATED') {
      throw new MatrixError({
        errcode: LoginError.UserDeactivated,
      });
    }

    if (err.httpStatus === 403) {
      throw new MatrixError({
        errcode: LoginError.Forbidden,
      });
    }

    throw new MatrixError({
      errcode: LoginError.Unknown,
    });
  }
  return res;
};

type PasswordLoginFormProps = {
  defaultUsername?: string;
  defaultEmail?: string;
};
export function PasswordLoginForm({ defaultUsername, defaultEmail }: PasswordLoginFormProps) {
  const server = useAuthServer();

  const serverDiscovery = useAutoDiscoveryInfo();
  const baseUrl = serverDiscovery['m.homeserver'].base_url;

  const [loginState, startLogin] = useAsyncCallback<
    LoginResponse,
    MatrixError,
    Parameters<typeof passwordLogin>
  >(useCallback(passwordLogin, []));

  useEffect(() => {
    if (loginState.status === AsyncStatus.Success) {
      // TODO: save response
      // redirect to home
    }
  }, [loginState]);

  const handleUsernameLogin = (username: string, password: string) => {
    startLogin(baseUrl, {
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

    const fetchBaseUrl = factoryFetchBaseUrl(mxIdServer);

    startLogin(fetchBaseUrl, {
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
          Username
        </Text>
        <Input
          defaultValue={defaultUsername ?? defaultEmail}
          style={{ paddingRight: config.space.S200 }}
          name="usernameInput"
          variant="Background"
          size="500"
          required
          outlined
          after={<UsernameHint server={server} />}
        />
        {loginState.status === AsyncStatus.Error &&
          loginState.error.errcode === LoginError.InvalidServer && (
            <LoginFieldError message="Failed to find your Matrix ID server." />
          )}
      </Box>
      <Box direction="Column" gap="100">
        <Text as="label" size="L400" priority="300">
          Password
        </Text>
        <UseStateProvider initial={false}>
          {(visible, setVisible) => (
            <Input
              style={{ paddingRight: config.space.S200 }}
              name="passwordInput"
              type={visible ? 'text' : 'password'}
              variant={visible ? 'Warning' : 'Background'}
              size="500"
              outlined
              required
              after={
                <IconButton
                  onClick={() => setVisible(!visible)}
                  type="button"
                  variant={visible ? 'Warning' : 'Background'}
                  size="400"
                  radii="300"
                >
                  <Icon
                    style={{ opacity: config.opacity.P300 }}
                    size="100"
                    src={visible ? Icons.Eye : Icons.EyeBlind}
                  />
                </IconButton>
              }
            />
          )}
        </UseStateProvider>
        <Box alignItems="Start" justifyContent="SpaceBetween" gap="200">
          {loginState.status === AsyncStatus.Error && (
            <>
              {loginState.error.errcode === LoginError.Forbidden && (
                <LoginFieldError message="Username or Password is wrong." />
              )}
              {loginState.error.errcode === LoginError.UserDeactivated && (
                <LoginFieldError message="This account has been deactivated." />
              )}
              {loginState.error.errcode === LoginError.InvalidRequest && (
                <LoginFieldError message="Failed to login. Part of your request data is invalid." />
              )}
              {loginState.error.errcode === LoginError.RateLimited && (
                <LoginFieldError message="Failed to login. Your login request has been rate-limited by server, Please try after some time." />
              )}
              {loginState.error.errcode === LoginError.Unknown && (
                <LoginFieldError message="Failed to login. Unknown reason." />
              )}
            </>
          )}
          <Box grow="Yes" shrink="No" justifyContent="End">
            <Text as="span" size="T200" priority="300" align="Right">
              {/* TODO: make reset password path */}
              <Link to={generatePath(REGISTER_PATH, { server })}>Forget Password?</Link>
            </Text>
          </Box>
        </Box>
      </Box>
      <span />
      <Button type="submit" variant="Primary" size="500">
        <Text as="span" size="B500">
          Login
        </Text>
      </Button>
    </Box>
  );
}
