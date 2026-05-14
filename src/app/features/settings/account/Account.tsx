import React from 'react';
import { Box, Text, IconButton, Icon, Icons, Scroll } from 'folds';
import { useTranslation } from 'react-i18next';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { MatrixId } from './MatrixId';
import { Profile } from './Profile';
import { ContactInformation } from './ContactInfo';
import { IgnoredUserList } from './IgnoredUserList';

type AccountProps = {
  requestClose: () => void;
};
export function Account({ requestClose }: AccountProps) {
  const { t } = useTranslation();
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              {t('settings.account')}
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
              <Profile />
              <MatrixId />
              <ContactInformation />
              <IgnoredUserList />
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
