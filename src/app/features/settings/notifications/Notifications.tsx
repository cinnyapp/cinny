import React from 'react';
import { Box, Text, IconButton, Icon, Icons, Scroll } from 'folds';
import { useTranslation } from 'react-i18next';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SystemNotification } from './SystemNotification';
import { AllMessagesNotifications } from './AllMessages';
import { SpecialMessagesNotifications } from './SpecialMessages';
import { KeywordMessagesNotifications } from './KeywordMessages';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';

type NotificationsProps = {
  requestClose: () => void;
};
export function Notifications({ requestClose }: NotificationsProps) {
  const { t } = useTranslation('settingsNotifications');
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              {t('title', { defaultValue: 'Notifications' })}
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
              <SystemNotification />
              <AllMessagesNotifications />
              <SpecialMessagesNotifications />
              <KeywordMessagesNotifications />
              <Box direction="Column" gap="100">
                <Text size="L400">{t('blockMessagesHeader', { defaultValue: 'Block Messages' })}</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    description={t('blockMessagesMoved', {
                      defaultValue: 'This option has been moved to "Account > Block Users" section.',
                    })}
                  />
                </SequenceCard>
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
