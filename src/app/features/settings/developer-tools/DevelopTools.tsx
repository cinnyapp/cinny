import React, { useCallback, useState } from 'react';
import { Box, Text, IconButton, Icon, Icons, Scroll, Switch, Button } from 'folds';
import { AccountDataEvents } from 'matrix-js-sdk';
import { Feature, ServerSupport } from 'matrix-js-sdk/lib/feature';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import {
  AccountDataDeleteCallback,
  AccountDataEditor,
  AccountDataSubmitCallback,
} from '../../../components/AccountDataEditor';
import { copyToClipboard } from '../../../utils/dom';
import { AccountDataList } from './AccountDataList';
import { useExtendedProfile } from '../../../hooks/useExtendedProfile';
import { useAccountDataCallback } from '../../../hooks/useAccountDataCallback';
import { CollapsibleCard } from '../../../components/CollapsibleCard';

type DeveloperToolsPage =
  | { name: 'index' }
  | { name: 'account-data'; type: string | null }
  | { name: 'profile-field'; type: string | null };

type DeveloperToolsProps = {
  requestClose: () => void;
};
export function DeveloperTools({ requestClose }: DeveloperToolsProps) {
  const mx = useMatrixClient();
  const userId = mx.getUserId() as string;

  const [accountDataTypes, setAccountDataKeys] = useState(() =>
    Array.from(mx.store.accountData.keys())
  );
  const accountDataDeletionSupported =
    (mx.canSupport.get(Feature.AccountDataDeletion) ?? ServerSupport.Unsupported) !==
    ServerSupport.Unsupported;
  useAccountDataCallback(
    mx,
    useCallback(() => {
      setAccountDataKeys(Array.from(mx.store.accountData.keys()));
    }, [mx])
  );

  const [extendedProfile, refreshExtendedProfile] = useExtendedProfile(userId);

  const [developerTools, setDeveloperTools] = useSetting(settingsAtom, 'developerTools');
  const [page, setPage] = useState<DeveloperToolsPage>({ name: 'index' });
  const [globalExpand, setGlobalExpand] = useState(false);
  const [profileExpand, setProfileExpand] = useState(false);

  const submitAccountData: AccountDataSubmitCallback = useCallback(
    async (type, content) => {
      await mx.setAccountData(type as keyof AccountDataEvents, content);
    },
    [mx]
  );

  const deleteAccountData: AccountDataDeleteCallback = useCallback(
    async (type) => {
      await mx.deleteAccountData(type as keyof AccountDataEvents);
    },
    [mx]
  );

  const submitProfileField: AccountDataSubmitCallback = useCallback(
    async (type, content) => {
      await mx.setExtendedProfileProperty(type, content);
      await refreshExtendedProfile();
    },
    [mx, refreshExtendedProfile]
  );

  const deleteProfileField: AccountDataDeleteCallback = useCallback(
    async (type) => {
      await mx.deleteExtendedProfileProperty(type);
      await refreshExtendedProfile();
    },
    [mx, refreshExtendedProfile]
  );

  const handleClose = useCallback(() => setPage({ name: 'index' }), [setPage]);

  switch (page.name) {
    case 'account-data':
      return (
        <AccountDataEditor
          type={page.type ?? undefined}
          content={
            page.type
              ? mx.getAccountData(page.type as keyof AccountDataEvents)?.getContent()
              : undefined
          }
          submitChange={submitAccountData}
          submitDelete={accountDataDeletionSupported ? deleteAccountData : undefined}
          requestClose={handleClose}
        />
      );

    case 'profile-field':
      return (
        <AccountDataEditor
          type={page.type ?? undefined}
          content={page.type ? extendedProfile?.[page.type] : undefined}
          submitChange={submitProfileField}
          submitDelete={deleteProfileField}
          requestClose={handleClose}
        />
      );

    default:
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
                              onClick={() =>
                                copyToClipboard(mx.getAccessToken() ?? '<NO_ACCESS_TOKEN_FOUND>')
                              }
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
                    <Box direction="Column" gap="100">
                      <Text size="L400">Account Data</Text>
                      <CollapsibleCard
                        expand={globalExpand}
                        setExpand={setGlobalExpand}
                        title="Account"
                        description="Private data stored in your account."
                      >
                        <AccountDataList
                          types={accountDataTypes}
                          onSelect={(type) => setPage({ name: 'account-data', type })}
                        />
                      </CollapsibleCard>
                      {extendedProfile && (
                        <CollapsibleCard
                          expand={profileExpand}
                          setExpand={setProfileExpand}
                          title="Profile"
                          description="Public data attached to your Matrix profile."
                        >
                          <AccountDataList
                            types={Object.keys(extendedProfile)}
                            onSelect={(type) => setPage({ name: 'profile-field', type })}
                          />
                        </CollapsibleCard>
                      )}
                    </Box>
                  )}
                </Box>
              </PageContent>
            </Scroll>
          </Box>
        </Page>
      );
  }
}
