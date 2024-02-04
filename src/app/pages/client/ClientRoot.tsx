import { Box, Spinner, Text } from 'folds';
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import initMatrix from '../../../client/initMatrix';
import { initHotkeys } from '../../../client/event/hotkeys';
import { initRoomListListener } from '../../../client/event/roomList';
import { getSecret } from '../../../client/state/auth';
import { SplashScreen } from '../../components/splash-screen';
import { CapabilitiesAndMediaConfigLoader } from '../../components/CapabilitiesAndMediaConfigLoader';
import { CapabilitiesProvider } from '../../hooks/useCapabilities';
import { MediaConfigProvider } from '../../hooks/useMediaConfig';
import { MatrixClientProvider } from '../../hooks/useMatrixClient';
import { SpecVersions } from './SpecVersions';

export function ClientRoot() {
  const [loading, setLoading] = useState(true);
  const { baseUrl } = getSecret();

  useEffect(() => {
    const handleStart = () => {
      initHotkeys();
      initRoomListListener(initMatrix.roomList);
      setLoading(false);
    };
    initMatrix.once('init_loading_finished', handleStart);
    if (!initMatrix.matrixClient) initMatrix.init();
    return () => {
      initMatrix.removeListener('init_loading_finished', handleStart);
    };
  }, []);

  return (
    <SpecVersions baseUrl={baseUrl!}>
      {loading ? (
        <SplashScreen>
          <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
            <Spinner variant="Secondary" size="600" />
            <Text>Heating up</Text>
          </Box>
        </SplashScreen>
      ) : (
        <MatrixClientProvider value={initMatrix.matrixClient!}>
          <CapabilitiesAndMediaConfigLoader>
            {(capabilities, mediaConfig) => (
              <CapabilitiesProvider value={capabilities ?? {}}>
                <MediaConfigProvider value={mediaConfig ?? {}}>
                  <Outlet />
                </MediaConfigProvider>
              </CapabilitiesProvider>
            )}
          </CapabilitiesAndMediaConfigLoader>
        </MatrixClientProvider>
      )}
    </SpecVersions>
  );
}
