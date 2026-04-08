import React, { ReactNode } from 'react';
import { Box, Dialog, config, Text, Button, Spinner } from 'folds';
import { useTranslation } from 'react-i18next';
import { SpecVersionsLoader } from '../../components/SpecVersionsLoader';
import { SpecVersionsProvider } from '../../hooks/useSpecVersions';
import { SplashScreen } from '../../components/splash-screen';

export function SpecVersions({ baseUrl, children }: { baseUrl: string; children: ReactNode }) {
  const { t } = useTranslation('common');
  return (
    <SpecVersionsLoader
      baseUrl={baseUrl}
      fallback={() => (
        <SplashScreen>
          <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
            <Spinner variant="Secondary" size="600" />
            <Text>{t('connectingToServer', { defaultValue: 'Connecting to server' })}</Text>
          </Box>
        </SplashScreen>
      )}
      error={(err, retry, ignore) => (
        <SplashScreen>
          <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
            <Dialog>
              <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
                <Text>
                  {t('unableToConnectHomeserver', {
                    defaultValue:
                      'Unable to connect to the homeserver. The homeserver or your internet connection may be down.',
                  })}
                </Text>
                <Button variant="Critical" onClick={retry}>
                  <Text as="span" size="B400">
                    {t('retry', { defaultValue: 'Retry' })}
                  </Text>
                </Button>
                <Button variant="Critical" onClick={ignore} fill="Soft">
                  <Text as="span" size="B400">
                    {t('continue', { defaultValue: 'Continue' })}
                  </Text>
                </Button>
              </Box>
            </Dialog>
          </Box>
        </SplashScreen>
      )}
    >
      {(versions) => <SpecVersionsProvider value={versions}>{children}</SpecVersionsProvider>}
    </SpecVersionsLoader>
  );
}
