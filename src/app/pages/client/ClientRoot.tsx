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
import { initializeClient, InitializeClientResult } from '../../../client/initialize';
import { ClientContextProvider } from '../../hooks/useClient';
import { InitialSyncSplashScreen } from './InitialSyncSplashScreen';
import { AutoDiscovery } from './AutoDiscovery';
import { ClientRootOptions } from './ClientRootOptions';
import { FlickerText } from '../../styles/Animations.css';
import { useSession } from '../../hooks/useSessions';

type ClientRootProps = {
  children: ReactNode;
};
export function ClientRoot({ children }: ClientRootProps) {
  const session = useSession();

  const [initState, initialize] = useAsyncCallback<InitializeClientResult, Error, []>(
    useCallback(() => initializeClient(session), [session])
  );

  useEffect(() => {
    if (initState.status === AsyncStatus.Idle) {
      initialize();
    }
  }, [initState, initialize]);

  useEffect(() => {
    const { ct, dispose } = initState.status === AsyncStatus.Success ? initState.data : {};
    ct?.sync.controller.start();

    return () => {
      dispose?.();
    };
  }, [initState]);

  return (
    <AutoDiscovery userId={session.userId} baseUrl={session.baseUrl}>
      {initState.status !== AsyncStatus.Success && <ClientRootOptions />}
      <SpecVersions baseUrl={session.baseUrl}>
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
                <Text className={FlickerText} size="T200" align="Center">
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
          <ClientContextProvider value={initState.data.ct}>
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
