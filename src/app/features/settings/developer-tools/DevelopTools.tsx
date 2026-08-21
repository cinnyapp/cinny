import React, { useCallback, useState } from 'react';
import { Box, Text, IconButton, Icon, Icons, Scroll, Switch, Button } from 'folds';
import { putAccountData } from 'neurone/lib/api/matrix/client/v3/user';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { AccountDataEvent } from 'neurone/lib/api/types';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useSetting } from '../../../state/hooks/settings';
import {
  AccountDataEditor,
  AccountDataSubmitCallback,
} from '../../../components/AccountDataEditor';
import { copyToClipboard } from '../../../utils/dom';
import { useClient } from '../../../hooks/useClient';
import { AccountData } from './AccountData';

type DeveloperToolsProps = {
  requestClose: () => void;
};
export function DeveloperTools({ requestClose }: DeveloperToolsProps) {
  const ct = useClient();
  const [developerTools, setDeveloperTools] = useSetting('developerTools');

  const [expand, setExpend] = useState(false);
  const [editAccountData, setEditAccountData] = useState<AccountDataEvent | null>();

  const submitAccountData: AccountDataSubmitCallback = useCallback(
    async (type, content) => {
      const resp = await ct.requestAuthJSON(
        putAccountData({
          pathParams: { type, userId: ct.session.userId },
          body: content,
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error ?? err.data.errcode);
    },
    [ct]
  );

  if (editAccountData !== undefined) {
    return (
      <AccountDataEditor
        event={editAccountData ?? undefined}
        submitChange={submitAccountData}
        requestClose={() => setEditAccountData(undefined)}
      />
    );
  }

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Developer Tools
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <Box direction="Column" gap="100">
                <Text size="L400">Options</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title="Enable Developer Tools"
                    after={
                      <Switch
                        variant="Primary"
                        value={developerTools}
                        onChange={setDeveloperTools}
                      />
                    }
                  />
                </SequenceCard>
                {developerTools && (
                  <SequenceCard
                    className={SequenceCardStyle}
                    variant="SurfaceVariant"
                    direction="Column"
                    gap="400"
                  >
                    <SettingTile
                      title="Access Token"
                      description="Copy access token to clipboard."
                      after={
                        <Button
                          onClick={() => copyToClipboard(ct.session.accessToken)}
                          variant="Secondary"
                          fill="Soft"
                          size="300"
                          radii="300"
                          outlined
                        >
                          <Text size="B300">Copy</Text>
                        </Button>
                      }
                    />
                  </SequenceCard>
                )}
              </Box>
              {developerTools && (
                <AccountData
                  expand={expand}
                  onExpandToggle={setExpend}
                  onSelect={setEditAccountData}
                />
              )}
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
