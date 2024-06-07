import { Box, Spinner, Text } from 'folds';
import React, { ReactNode, useEffect, useState } from 'react';
import initMatrix from '../../../client/initMatrix';
import { initHotkeys } from '../../../client/event/hotkeys';
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

type ClientRootProps = {
  children: ReactNode;
};
export function ClientRoot({ children }: ClientRootProps) {
  const [loading, setLoading] = useState(true);
  const { baseUrl } = getSecret();

  useEffect(() => {
    const handleStart = () => {
      initHotkeys();
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
        <ClientRootLoading />
      ) : (
        <MatrixClientProvider value={initMatrix.matrixClient!}>
          <CapabilitiesAndMediaConfigLoader>
            {(capabilities, mediaConfig) => (
              <CapabilitiesProvider value={capabilities ?? {}}>
                <MediaConfigProvider value={mediaConfig ?? {}}>
                  {children}

                  {/* TODO: remove these components after navigation refactor */}
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
