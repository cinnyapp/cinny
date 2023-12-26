import React from 'react';
import { Box, Line, Text, color } from 'folds';
import { Link, generatePath, useSearchParams } from 'react-router-dom';
import { REGISTER_PATH } from '../paths';
import { useAuthFlows } from '../../hooks/useAuthFlows';
import { useAuthServer } from '../../hooks/useAuthServer';
import { useParsedLoginFlows } from '../../hooks/useParsedLoginFlows';
import { PasswordLoginForm } from './PasswordLoginForm';
import { SSOLogin } from './SSOLogin';
import { TokenLogin } from './TokenLogin';

export type LoginSearchParams = {
  username?: string;
  email?: string;
  loginToken?: string;
};

const getLoginSearchParams = (searchParams: URLSearchParams): LoginSearchParams => ({
  username: searchParams.get('username') ?? undefined,
  email: searchParams.get('email') ?? undefined,
  loginToken: searchParams.get('loginToken') ?? undefined,
});

export function Login() {
  const server = useAuthServer();
  const { loginFlows } = useAuthFlows();
  const [searchParams] = useSearchParams();
  const loginSearchParams = getLoginSearchParams(searchParams);

  const parsedFlows = useParsedLoginFlows(loginFlows.flows);

  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400">
        Login
      </Text>
      {parsedFlows.token && loginSearchParams.loginToken && (
        <TokenLogin token={loginSearchParams.loginToken} />
      )}
      {parsedFlows.password && (
        <>
          <PasswordLoginForm
            defaultUsername={loginSearchParams.username}
            defaultEmail={loginSearchParams.email}
          />
          <span data-spacing-node />
          {parsedFlows.sso && (
            <Box gap="400" alignItems="Center">
              <Line style={{ flexGrow: 1 }} direction="Horizontal" size="300" variant="Surface" />
              <Text>OR</Text>
              <Line style={{ flexGrow: 1 }} direction="Horizontal" size="300" variant="Surface" />
            </Box>
          )}
        </>
      )}
      {parsedFlows.sso && (
        <>
          <SSOLogin
            providers={parsedFlows.sso.identity_providers}
            canPasswordLogin={!!parsedFlows.password}
          />
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
