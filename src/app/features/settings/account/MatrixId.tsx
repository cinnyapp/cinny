import React from 'react';
import { Box, Text, Chip } from 'folds';
import { useTranslation } from 'react-i18next';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { copyToClipboard } from '../../../utils/dom';

export function MatrixId() {
  const { t } = useTranslation('settingsAccount');
  const mx = useMatrixClient();
  const userId = mx.getUserId()!;

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{t('matrixIdHeader', { defaultValue: 'Matrix ID' })}</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={userId}
          after={
            <Chip variant="Secondary" radii="Pill" onClick={() => copyToClipboard(userId)}>
              <Text size="T200">{t('copy', { defaultValue: 'Copy' })}</Text>
            </Chip>
          }
        />
      </SequenceCard>
    </Box>
  );
}
