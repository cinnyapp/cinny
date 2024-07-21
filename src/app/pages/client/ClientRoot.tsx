import { Box, Button, config, Dialog, Spinner, Text } from 'folds';
import {
  ClientEvent,
  ClientEventHandlerMap,
  HttpApiEvent,
  HttpApiEventHandlerMap,
  MatrixClient,
} from 'matrix-js-sdk';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { initClient, startClient } from '../../../client/initMatrix';
import { getSecret } from '../../../client/state/auth';
import { SplashScreen } from '../../components/splash-screen';
import { CapabilitiesAndMediaConfigLoader } from '../../components/CapabilitiesAndMediaConfigLoader';
import { CapabilitiesProvider } from '../../hooks/useCapabilities';
import { MediaConfigProvider } from '../../hooks/useMediaConfig';
import { MatrixClientProvider } from '../../hooks/useMatrixClient';
import { SpecVersions } from './SpecVersions';
import Windows from '../../organisms/pw/Windows';
import Dialogs from '../../organisms/pw/Dialogs';
import ReusableContextMenu from '../../atoms/context-menu/ReusableContextMenu';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';

function SystemEmojiFeature() {
  const [twitterEmoji] = useSetting(settingsAtom, 'twitterEmoji');

  if (twitterEmoji) {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji');
  } else {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji_DISABLED');
  }

  return null;
}

function ClientRootLoading() {
  return (
    <SplashScreen>
      <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
        <Spinner variant="Secondary" size="600" />
        <Text>Heating up</Text>
      </Box>
    </SplashScreen>
  );
}

const useLogoutListener = (mx?: MatrixClient) => {
  useEffect(() => {
    const handleLogout: HttpApiEventHandlerMap[HttpApiEvent.SessionLoggedOut] = async () => {
      mx?.stopClient();
      await mx?.clearStores();
      window.localStorage.clear();
      window.location.reload();
    };

    mx?.on(HttpApiEvent.SessionLoggedOut, handleLogout);
    return () => {
      mx?.removeListener(HttpApiEvent.SessionLoggedOut, handleLogout);
    };
  }, [mx]);
};

type ClientRootProps = {
  children: ReactNode;
};
export function ClientRoot({ children }: ClientRootProps) {
  const [loading, setLoading] = useState(true);
  const { baseUrl } = getSecret();

  const [loadState, loadMatrix] = useAsyncCallback<MatrixClient, Error, []>(
    useCallback(() => initClient(getSecret() as any), [])
  );
  const mx = loadState.status === AsyncStatus.Success ? loadState.data : undefined;
  const [startState, startMatrix] = useAsyncCallback<void, Error, [MatrixClient]>(
    useCallback((m) => startClient(m), [])
  );

  useLogoutListener(mx);

  useEffect(() => {
    if (loadState.status === AsyncStatus.Idle) {
      loadMatrix();
    }
  }, [loadState, loadMatrix]);

  useEffect(() => {
    if (mx && !mx.clientRunning) {
      startMatrix(mx);
    }
    const handleSync: ClientEventHandlerMap[ClientEvent.Sync] = (state, prevState) => {
      if (state === 'PREPARED' && prevState === null) {
        setLoading(false);
      }
    };
    mx?.on(ClientEvent.Sync, handleSync);
    return () => {
      mx?.removeListener(ClientEvent.Sync, handleSync);
    };
  }, [mx, startMatrix]);

  return (
    <SpecVersions baseUrl={baseUrl!}>
      {(loadState.status === AsyncStatus.Error || startState.status === AsyncStatus.Error) && (
        <SplashScreen>
          <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
            <Dialog>
              <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
                {loadState.status === AsyncStatus.Error && (
                  <Text>{`Failed to load. ${loadState.error.message}`}</Text>
                )}
                {startState.status === AsyncStatus.Error && (
                  <Text>{`Failed to load. ${startState.error.message}`}</Text>
                )}
                <Button variant="Critical" onClick={loadMatrix}>
                  <Text as="span" size="B400">
                    Retry
                  </Text>
                </Button>
              </Box>
            </Dialog>
          </Box>
        </SplashScreen>
      )}
      {loading || !mx ? (
        <ClientRootLoading />
      ) : (
        <MatrixClientProvider value={mx}>
          <CapabilitiesAndMediaConfigLoader>
            {(capabilities, mediaConfig) => (
              <CapabilitiesProvider value={capabilities ?? {}}>
                <MediaConfigProvider value={mediaConfig ?? {}}>
                  {children}
                  <Windows />
                  <Dialogs />
                  <ReusableContextMenu />
                  <SystemEmojiFeature />
                </MediaConfigProvider>
              </CapabilitiesProvider>
            )}
          </CapabilitiesAndMediaConfigLoader>
        </MatrixClientProvider>
      )}
    </SpecVersions>
  );
}
