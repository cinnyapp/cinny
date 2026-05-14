import React from 'react';
import { Box, Line, Text } from 'folds';
import { useTranslation } from 'react-i18next';

export function OrDivider() {
  const { t } = useTranslation();
  return (
    <Box gap="400" alignItems="Center">
      <Line style={{ flexGrow: 1 }} direction="Horizontal" size="300" variant="Surface" />
      <Text>{t('auth.or')}</Text>
      <Line style={{ flexGrow: 1 }} direction="Horizontal" size="300" variant="Surface" />
    </Box>
  );
}
