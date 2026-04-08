import React, { CSSProperties } from 'react';
import { Badge, Box, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { EmojiBoardTab } from '../types';

const styles: CSSProperties = {
  cursor: 'pointer',
};

export function EmojiBoardTabs({
  tab,
  onTabChange,
}: {
  tab: EmojiBoardTab;
  onTabChange: (tab: EmojiBoardTab) => void;
}) {
  const { t } = useTranslation('common');

  return (
    <Box gap="100">
      <Badge
        style={styles}
        as="button"
        variant="Secondary"
        fill={tab === EmojiBoardTab.Sticker ? 'Solid' : 'None'}
        size="500"
        onClick={() => onTabChange(EmojiBoardTab.Sticker)}
      >
        <Text as="span" size="L400">
          {t('sticker', { defaultValue: 'Sticker' })}
        </Text>
      </Badge>
      <Badge
        style={styles}
        as="button"
        variant="Secondary"
        fill={tab === EmojiBoardTab.Emoji ? 'Solid' : 'None'}
        size="500"
        onClick={() => onTabChange(EmojiBoardTab.Emoji)}
      >
        <Text as="span" size="L400">
          {t('emoji', { defaultValue: 'Emoji' })}
        </Text>
      </Badge>
    </Box>
  );
}
