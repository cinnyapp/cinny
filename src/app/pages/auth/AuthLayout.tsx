import React, { useCallback, useEffect } from 'react';
import { Box, Header, Scroll, Spinner, Text, color } from 'folds';
import {
  Outlet,
  generatePath,
  matchPath,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

import { AuthFooter } from './AuthFooter';
import * as css from './styles.css';
import * as PatternsCss from '../../styles/Patterns.css';
import {
  clientAllowedServer,
  clientDefaultServer,
  useClientConfig,
} from '../../hooks/useClientConfig';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { LOGIN_PATH, REGISTER_PATH, RESET_PASSWORD_PATH } from '../paths';
import CinnySVG from '../../../../public/res/svg/cinny.svg';
import { ServerPicker } from './ServerPicker';
import { AutoDiscoveryAction, autoDiscovery } from '../../cs-api';
import { SpecVersionsLoader } from '../../components/SpecVersionsLoader';
import { SpecVersionsProvider } from '../../hooks/useSpecVersions';
import { AutoDiscoveryInfoProvider } from '../../hooks/useAutoDiscoveryInfo';
import { AuthFlowsLoader } from '../../components/AuthFlowsLoader';
import { AuthFlowsProvider } from '../../hooks/useAuthFlows';
import { AuthServerProvider } from '../../hooks/useAuthServer';
import { tryDecodeURIComponent } from '../../utils/dom';

const currentAuthPath = (pathname: string): string => {
  if (matchPath(LOGIN_PATH, pathname)) {
    return LOGIN_PATH;
  }
  if (matchPath(RESET_PASSWORD_PATH, pathname)) {
    return RESET_PASSWORD_PATH;
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
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { server: urlEncodedServer } = useParams();

  const clientConfig = useClientConfig();

  const defaultServer = clientDefaultServer(clientConfig);
  let server: string = urlEncodedServer ? tryDecodeURIComponent(urlEncodedServer) : defaultServer;

  if (!clientAllowedServer(clientConfig, server)) {
    server = defaultServer;
  }

  const [discoveryState, discoverServer] = useAsyncCallback(
    useCallback(async (serverName: string) => {
      const response = await autoDiscovery(fetch, serverName);
      return {
        serverName,
        response,
      };
    }, [])
  );

  useEffect(() => {
    if (server) discoverServer(server);
  }, [discoverServer, server]);

  // if server is mismatches with path server, update path
  useEffect(() => {
    if (!urlEncodedServer || tryDecodeURIComponent(urlEncodedServer) !== server) {
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
      if (newServer === server) {
        if (discoveryState.status === AsyncStatus.Loading) return;
        discoverServer(server);
        return;
      }
      navigate(
        generatePath(currentAuthPath(location.pathname), { server: encodeURIComponent(newServer) })
      );
    },
    [navigate, location, discoveryState, server, discoverServer]
  );

  const [autoDiscoveryError, autoDiscoveryInfo] =
    discoveryState.status === AsyncStatus.Success ? discoveryState.data.response : [];

  return (
    <Scroll variant="Background" visibility="Hover" size="300" hideTrack>
      <Box
        className={classNames(css.AuthLayout, PatternsCss.BackgroundDotPattern)}
        direction="Column"
        alignItems="Center"
        justifyContent="SpaceBetween"
        gap="400"
      >
        <Box direction="Column" className={css.AuthCard}>
          <Header className={css.AuthHeader} size="600" variant="Surface">
            <Box grow="Yes" direction="Row" gap="300" alignItems="Center">
              <img
                className={css.AuthLogo}
                src={CinnySVG}
                alt={t('cinnyLogoAlt', { ns: 'common', defaultValue: 'Cinny Logo' })}
              />
              <Text size="H3">{t('appName', { ns: 'common', defaultValue: 'Cinny' })}</Text>
            </Box>
          </Header>
          <Box className={css.AuthCardContent} direction="Column">
            <Box direction="Column" gap="100">
              <Text as="label" size="L400" priority="300">
                {t('homeserverLabel', { defaultValue: 'Homeserver' })}
              </Text>
              <ServerPicker
                server={server}
                serverList={clientConfig.homeserverList ?? []}
                allowCustomServer={clientConfig.allowCustomHomeservers}
                onServerChange={selectServer}
              />
            </Box>
            {discoveryState.status === AsyncStatus.Loading && (
              <AuthLayoutLoading
                message={t('lookingForHomeserver', { defaultValue: 'Looking for homeserver...' })}
              />
            )}
            {discoveryState.status === AsyncStatus.Error && (
              <AuthLayoutError
                message={t('failedToFindHomeserver', { defaultValue: 'Failed to find homeserver.' })}
              />
            )}
            {autoDiscoveryError?.action === AutoDiscoveryAction.FAIL_PROMPT && (
              <AuthLayoutError
                message={t('failedToConnectHomeserverUnusable', {
                  defaultValue:
                    'Failed to connect. Homeserver configuration found with {{host}} appears unusable.',
                  host: autoDiscoveryError.host,
                })}
              />
            )}
            {autoDiscoveryError?.action === AutoDiscoveryAction.FAIL_ERROR && (
              <AuthLayoutError
                message={t('failedToConnectInvalidBaseUrl', {
                  defaultValue:
                    'Failed to connect. Homeserver configuration base_url appears invalid.',
                })}
              />
            )}
            {discoveryState.status === AsyncStatus.Success && autoDiscoveryInfo && (
              <AuthServerProvider value={discoveryState.data.serverName}>
                <AutoDiscoveryInfoProvider value={autoDiscoveryInfo}>
                  <SpecVersionsLoader
                    baseUrl={autoDiscoveryInfo['m.homeserver'].base_url}
                    fallback={() => (
                      <AuthLayoutLoading
                        message={t('connectingTo', {
                          defaultValue: 'Connecting to {{baseUrl}}',
                          baseUrl: autoDiscoveryInfo['m.homeserver'].base_url,
                        })}
                      />
                    )}
                    error={() => (
                      <AuthLayoutError
                        message={t('failedToConnectUnavailable', {
                          defaultValue:
                            'Failed to connect. Either homeserver is unavailable at this moment or does not exist.',
                        })}
                      />
                    )}
                  >
                    {(specVersions) => (
                      <SpecVersionsProvider value={specVersions}>
                        <AuthFlowsLoader
                          fallback={() => (
                            <AuthLayoutLoading
                              message={t('loadingAuthFlow', {
                                defaultValue: 'Loading authentication flow...',
                              })}
                            />
                          )}
                          error={() => (
                            <AuthLayoutError
                              message={t('failedToGetAuthFlow', {
                                defaultValue: 'Failed to get authentication flow information.',
                              })}
                            />
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
              </AuthServerProvider>
            )}
          </Box>
        </Box>
        <AuthFooter />
      </Box>
    </Scroll>
  );
}
