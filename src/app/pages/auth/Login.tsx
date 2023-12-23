import React, { FormEventHandler, useCallback, useState } from 'react';
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
import { Link, generatePath, useSearchParams } from 'react-router-dom';
import { createClient } from 'matrix-js-sdk';
import to from 'await-to-js';
import { REGISTER_PATH } from '../paths';
import { useAuthFlows } from '../../hooks/useAuthFlows';
import { useAuthServer } from '../../hooks/useAuthServer';
import { UseStateProvider } from '../../components/UseStateProvider';
import { useParsedLoginFlows } from '../../hooks/useParsedLoginFlows';
import { getMxIdLocalPart, getMxIdServer, isUserId } from '../../utils/matrix';
import { EMAIL_REGEX } from '../../utils/regex';
import { useAutoDiscoveryInfo } from '../../hooks/useAutoDiscoveryInfo';
import { useAsyncCallback } from '../../hooks/useAsyncCallback';
import { AutoDiscoveryAction, autoDiscovery, specVersions } from '../../cs-api';

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

type PasswordLoginFormProps = {
  defaultUsername?: string;
  defaultEmail?: string;
};
export function PasswordLoginForm({ defaultUsername, defaultEmail }: PasswordLoginFormProps) {
  const server = useAuthServer();

  const serverDiscovery = useAutoDiscoveryInfo();
  const baseUrl = serverDiscovery['m.homeserver'].base_url;

  const [loginState, startLogin] = useAsyncCallback(
    useCallback(async (serverBaseUrl: string, data: object) => {
      const mx = createClient({ baseUrl: serverBaseUrl });
      // const [err, res] = await to<{
      //   access_token: string,
      //   device_id: string,
      //   user_id: string,
      //   expires_in_ms?: number,
      //   refresh_token: string,
      // }>(mx.login('m.login.password', data));
      // console.log(res?.status);
      // console.log(err, res);
      return undefined;
    }, [])
  );

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

    const [, discovery] = await to(autoDiscovery(fetch, mxIdServer));

    let mxIdBaseUrl: string | undefined;
    const [discoverError, discoveryInfo] = discovery ?? [];
    if (discoverError?.action === AutoDiscoveryAction.IGNORE) {
      mxIdBaseUrl = discoverError.host;
    }
    if (discoveryInfo) {
      mxIdBaseUrl = discoveryInfo['m.homeserver'].base_url;
    }
    if (!mxIdBaseUrl) {
      alert(
        'Failed to find MXID homeserver! Please enter server in Homeserver input for more details.'
      );
      return;
    }
    const [, versions] = await to(specVersions(fetch, mxIdBaseUrl));
    if (!versions) {
      alert('Homeserver URL does not appear to be a valid Matrix homeserver.');
      return;
    }

    startLogin(mxIdBaseUrl, {
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
              variant="Background"
              size="500"
              outlined
              required
              after={
                <IconButton
                  onClick={() => setVisible(!visible)}
                  type="button"
                  variant="Background"
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
        <Box justifyContent="End">
          <Text as="span" size="T200" priority="300" align="Right">
            {/* TODO: make reset password path */}
            <Link to={generatePath(REGISTER_PATH, { server })}>Forget Password?</Link>
          </Text>
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

const getLoginSearchParams = (
  searchParams: URLSearchParams
): {
  username?: string;
  email?: string;
  loginToken?: string;
} => ({
  username: searchParams.get('username') ?? undefined,
  email: searchParams.get('email') ?? undefined,
  loginToken: searchParams.get('loginToken') ?? undefined,
});

export function Login() {
  const server = useAuthServer();
  const { loginFlows, registerFlows } = useAuthFlows();
  const [searchParams] = useSearchParams();
  const loginSearchParams = getLoginSearchParams(searchParams);

  const parsedFlows = useParsedLoginFlows(loginFlows.flows);
  console.log(parsedFlows);
  console.log(server, loginFlows, registerFlows);

  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400">
        Login
      </Text>
      {parsedFlows.token && false && <p>Token login</p>}
      {parsedFlows.password && (
        <>
          <PasswordLoginForm
            defaultUsername={loginSearchParams.username}
            defaultEmail={loginSearchParams.email}
          />
          <span data-spacing-node />
        </>
      )}
      {parsedFlows.sso && (
        <>
          <Text align="Center">SSO login supported</Text>
          <span data-spacing-node />
        </>
      )}
      {Object.entries(parsedFlows).every(([, flow]) => flow === undefined) && (
        <>
          <Text style={{ color: color.Critical.Main }}>
            {`This client does not support any login method return by "${server}" homeserver.`}
          </Text>
          <span data-spacing-node />
        </>
      )}
      <Text align="Center">
        Do not have an account? <Link to={generatePath(REGISTER_PATH, { server })}>Register</Link>
      </Text>
    </Box>
  );
}
