import React, { useCallback, useEffect } from 'react';
import { Box, Scroll, Spinner, Text, color } from 'folds';
import {
  LoaderFunction,
  Outlet,
  generatePath,
  matchPath,
  redirect,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import classNames from 'classnames';

import { AuthFooter } from './AuthFooter';
import * as css from './styles.css';
import * as PatternsCss from '../../styles/Patterns.css';
import { isAuthenticated } from '../../../client/state/auth';
import { useClientConfig } from '../../hooks/useClientConfig';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { LOGIN_PATH, REGISTER_PATH } from '../paths';
import CinnySVG from '../../../../public/res/svg/cinny.svg';
import { ServerPicker } from './ServerPicker';
import { AutoDiscoveryAction, autoDiscovery } from '../../cs-api';
import { SpecVersionsLoader } from '../../components/SpecVersionsLoader';
import { SpecVersionsProvider } from '../../hooks/useSpecVersions';
import { AutoDiscoveryInfoProvider } from '../../hooks/useAutoDiscoveryInfo';
import { AuthFlowsLoader } from '../../components/AuthFlowsLoader';
import { AuthFlowsProvider } from '../../hooks/useAuthFlows';

export const authLayoutLoader: LoaderFunction = () => {
  // TODO: remove false case
  const isAuth = false && isAuthenticated();
  if (isAuth) {
    return redirect('/');
  }

  return null;
};

const currentAuthPath = (pathname: string): string => {
  if (matchPath(LOGIN_PATH, pathname)) {
    return LOGIN_PATH;
  }
  if (matchPath(REGISTER_PATH, pathname)) {
    return REGISTER_PATH;
  }
  return LOGIN_PATH;
};

function AuthLayoutLoading({ message }: { message: string }) {
  return (
    <Box justifyContent="Center" alignItems="Center" gap="200">
      <Spinner size="100" variant="Secondary" />
      <Text align="Center" size="T300">
        {message}
      </Text>
    </Box>
  );
}

function AuthLayoutError({ message }: { message: string }) {
  return (
    <Box justifyContent="Center" alignItems="Center" gap="200">
      <Text align="Center" style={{ color: color.Critical.Main }} size="T300">
        {message}
      </Text>
    </Box>
  );
}

export function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { server: urlEncodedServer } = useParams();

  const { homeserverList, defaultHomeserver, allowCustomHomeservers } = useClientConfig();

  const defaultServer = homeserverList?.[defaultHomeserver ?? 0] ?? 'matrix.org';
  let server = urlEncodedServer ? decodeURIComponent(urlEncodedServer) : defaultServer;
  if (!allowCustomHomeservers && !homeserverList?.includes(server)) {
    server = defaultServer;
  }

  const [discoveryState, discoverServer] = useAsyncCallback(
    useCallback((serverDomain: string) => autoDiscovery(fetch, serverDomain), [])
  );

  useEffect(() => {
    if (server) discoverServer(server);
  }, [discoverServer, server]);

  // if server is mismatches with path server, update path
  useEffect(() => {
    if (!urlEncodedServer || decodeURIComponent(urlEncodedServer) !== server) {
      navigate(
        generatePath(currentAuthPath(location.pathname), {
          server: encodeURIComponent(server),
        }),
        { replace: true }
      );
    }
  }, [urlEncodedServer, navigate, location, server]);

  const selectServer = useCallback(
    (newServer: string) => {
      navigate(
        generatePath(currentAuthPath(location.pathname), { server: encodeURIComponent(newServer) })
      );
    },
    [navigate, location]
  );

  const [autoDiscoveryError, autoDiscoveryInfo] =
    discoveryState.status === AsyncStatus.Success ? discoveryState.data : [];

  let usableAutoDiscoveryInfo = autoDiscoveryInfo;
  if (autoDiscoveryError?.action === AutoDiscoveryAction.IGNORE) {
    usableAutoDiscoveryInfo = {
      'm.homeserver': {
        base_url: autoDiscoveryError.host,
      },
    };
  }

  return (
    <Scroll variant="Background" visibility="Hover" size="300" hideTrack>
      <Box
        className={classNames(css.AuthLayout, PatternsCss.BackgroundDotPattern)}
        direction="Column"
        alignItems="Center"
        justifyContent="SpaceBetween"
        gap="700"
      >
        <Box direction="Column" className={css.AuthCard}>
          <Box justifyContent="Center">
            <img className={css.AuthLogo} src={CinnySVG} alt="Cinny Logo" />
          </Box>
          <Box
            className={css.AuthHeader}
            direction="Column"
            gap="100"
            alignItems="Center"
            justifyContent="Center"
          >
            <Text size="H3">Cinny</Text>
          </Box>
          <Box className={css.AuthCardContent} direction="Column">
            <Box direction="Column" gap="100">
              <Text as="label" size="L400" priority="300">
                Homeserver
              </Text>
              <ServerPicker
                defaultServer={server}
                serverList={homeserverList ?? []}
                allowCustomServer={allowCustomHomeservers}
                onServerChange={selectServer}
              />
            </Box>
            {discoveryState.status === AsyncStatus.Loading && (
              <AuthLayoutLoading message="Looking for homeserver..." />
            )}
            {discoveryState.status === AsyncStatus.Error && (
              <AuthLayoutError message="Failed to find homeserver." />
            )}
            {autoDiscoveryError?.action === AutoDiscoveryAction.FAIL_PROMPT && (
              <AuthLayoutError
                message={`Failed to connect. Homeserver configuration found with ${autoDiscoveryError.host} appears unusable.`}
              />
            )}
            {autoDiscoveryError?.action === AutoDiscoveryAction.FAIL_ERROR && (
              <AuthLayoutError message="Failed to connect. Homeserver configuration base_url appears invalid." />
            )}
            {usableAutoDiscoveryInfo && (
              <AutoDiscoveryInfoProvider value={usableAutoDiscoveryInfo}>
                <SpecVersionsLoader
                  fallback={() => (
                    <AuthLayoutLoading
                      message={`Connecting to ${usableAutoDiscoveryInfo?.['m.homeserver'].base_url}`}
                    />
                  )}
                  error={() => (
                    <AuthLayoutError message="Failed to connect. Homeserver URL does not appear to be a valid Matrix homeserver." />
                  )}
                >
                  {(specVersions) => (
                    <SpecVersionsProvider value={specVersions}>
                      <AuthFlowsLoader
                        fallback={() => (
                          <AuthLayoutLoading message="Loading authentication flow..." />
                        )}
                        error={() => (
                          <AuthLayoutError message="Failed to get authentication flow information." />
                        )}
                      >
                        {(authFlows) => (
                          <AuthFlowsProvider value={authFlows}>
                            <Outlet />
                          </AuthFlowsProvider>
                        )}
                      </AuthFlowsLoader>
                    </SpecVersionsProvider>
                  )}
                </SpecVersionsLoader>
              </AutoDiscoveryInfoProvider>
            )}
          </Box>
        </Box>
        <AuthFooter />
      </Box>
    </Scroll>
  );
}
