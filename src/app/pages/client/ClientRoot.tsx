import { Box, Button, config, Dialog, ProgressBar, Text, toRem } from 'folds';
import React, { ReactNode, useCallback, useEffect } from 'react';
import { SplashScreen } from '../../components/splash-screen';
import { ServerConfigsLoader } from '../../components/ServerConfigsLoader';
import { CapabilitiesProvider } from '../../hooks/useCapabilities';
import { MediaConfigProvider } from '../../hooks/useMediaConfig';
import { SpecVersions } from './SpecVersions';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { SyncStatus } from './SyncStatus';
import { AuthMetadataProvider } from '../../hooks/useAuthMetadata';
import { getFallbackSession } from '../../state/sessions';
import { initializeClient } from '../../../client/initialize';
import { ClientContext } from '../../../client/context';
import { ClientContextProvider } from '../../hooks/useClient';
import { InitialSyncSplashScreen } from './InitialSyncSplashScreen';
import { AutoDiscovery } from './AutoDiscovery';
import { ClientRootOptions } from './ClientRootOptions';

type ClientRootProps = {
  children: ReactNode;
};
export function ClientRoot({ children }: ClientRootProps) {
  const { baseUrl, userId } = getFallbackSession() ?? {};

  const [initState, initialize] = useAsyncCallback<ClientContext, Error, []>(
    useCallback(() => {
      const session = getFallbackSession();
      if (!session) {
        throw new Error('No session Found!');
      }
      return initializeClient(session);
    }, [])
  );

  useEffect(() => {
    if (initState.status === AsyncStatus.Idle) {
      initialize();
    }
  }, [initState, initialize]);

  useEffect(() => {
    if (initState.status === AsyncStatus.Success) {
      const ct = initState.data;
      ct.sync.controller.start();
    }
  }, [initState]);

  return (
    <AutoDiscovery userId={userId!} baseUrl={baseUrl!}>
      {initState.status !== AsyncStatus.Success && <ClientRootOptions userId={userId!} />}
      <SpecVersions baseUrl={baseUrl!}>
        {initState.status === AsyncStatus.Error && (
          <SplashScreen>
            <Box
              direction="Column"
              grow="Yes"
              alignItems="Center"
              justifyContent="Center"
              gap="400"
            >
              <Dialog>
                <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
                  <Text>{`Failed to load. ${initState.error.message}`}</Text>
                  <Button variant="Critical" onClick={initialize}>
                    <Text as="span" size="B400">
                      Retry
                    </Text>
                  </Button>
                </Box>
              </Dialog>
            </Box>
          </SplashScreen>
        )}
        {(initState.status === AsyncStatus.Idle || initState.status === AsyncStatus.Loading) && (
          <SplashScreen
            footer={
              <Box
                style={{ maxWidth: toRem(280) }}
                direction="Column"
                grow="Yes"
                alignItems="Center"
                gap="200"
              >
                <Text size="T200" align="Center">
                  Sparking...
                </Text>
                <ProgressBar
                  style={{ width: '100%' }}
                  variant="Secondary"
                  size="300"
                  radii="Pill"
                  value={0}
                  outlined
                />
              </Box>
            }
          />
        )}
        {initState.status === AsyncStatus.Success && (
          <ClientContextProvider value={initState.data}>
            <InitialSyncSplashScreen>
              <SyncStatus />
              <ServerConfigsLoader>
                {(serverConfigs) => (
                  <CapabilitiesProvider value={serverConfigs.capabilities ?? {}}>
                    <MediaConfigProvider value={serverConfigs.mediaConfig ?? {}}>
                      <AuthMetadataProvider value={serverConfigs.authMetadata}>
                        {children}
                      </AuthMetadataProvider>
                    </MediaConfigProvider>
                  </CapabilitiesProvider>
                )}
              </ServerConfigsLoader>
            </InitialSyncSplashScreen>
          </ClientContextProvider>
        )}
      </SpecVersions>
    </AutoDiscovery>
  );
}
