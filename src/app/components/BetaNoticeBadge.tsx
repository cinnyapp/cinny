import React from 'react';
import { TooltipProvider, Tooltip, Box, Text, Badge, toRem } from 'folds';
import { useTranslation } from 'react-i18next';

export function BetaNoticeBadge() {
  const { t } = useTranslation('common');
  return (
    <TooltipProvider
      position="Right"
      align="Center"
      tooltip={
        <Tooltip style={{ maxWidth: toRem(200) }}>
          <Box direction="Column">
            <Text size="L400">{t('notice', { defaultValue: 'Notice' })}</Text>
            <Text size="T200">
              {t('featureUnderTesting', {
                defaultValue: 'This feature is under testing and may change over time.',
              })}
            </Text>
          </Box>
        </Tooltip>
      }
    >
      {(triggerRef) => (
        <Badge size="500" tabIndex={0} ref={triggerRef} variant="Primary" fill="Solid">
          <Text size="L400">{t('beta', { defaultValue: 'Beta' })}</Text>
        </Badge>
      )}
    </TooltipProvider>
  );
}
