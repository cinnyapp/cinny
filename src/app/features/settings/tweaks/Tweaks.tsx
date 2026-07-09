import React from 'react';
import { useAtom } from 'jotai';
import { Box, Scroll, Text, Input } from 'folds';
import { settingsAtom } from '../../../state/settings';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SettingTile } from '../../../components/setting-tile';

export function Tweaks() {
  const [settings, setSettings] = useAtom(settingsAtom);

  return (
    <Page>
      <PageHeader>
        <Text size="H4" weight="Bold">Tweaks</Text>
      </PageHeader>
      <PageContent>
        <Scroll hideTrack>
          <Box direction="Column" gap="700">
            <Box direction="Column" gap="100">
              <Text size="L400">API Settings</Text>
              <SettingTile title="Klipy API Key">
                <Box direction="Column" gap="200" grow="Yes">
                  <Text size="T300" priority="300">
                    Configure your Klipy API key to fetch GIFs from the Klipy service.
                  </Text>
                  <Input
                    value={settings.klipyApiKey || ''}
                    onChange={(evt: React.ChangeEvent<HTMLInputElement>) =>
                      setSettings({ ...settings, klipyApiKey: evt.currentTarget.value })
                    }
                    placeholder="Enter Klipy API Key"
                  />
                </Box>
              </SettingTile>
            </Box>
          </Box>
        </Scroll>
      </PageContent>
    </Page>
  );
}
