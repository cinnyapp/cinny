import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSpacing } from '../state/settings';

export type MessageSpacingItem = {
  name: string;
  spacing: MessageSpacing;
};

export const useMessageSpacingItems = (): MessageSpacingItem[] => {
  const { t } = useTranslation('settingsGeneral');

  return useMemo(
    () => [
      {
        spacing: '0',
        name: t('spacingNone', { defaultValue: 'None' }),
      },
      {
        spacing: '100',
        name: t('spacingUltraSmall', { defaultValue: 'Ultra Small' }),
      },
      {
        spacing: '200',
        name: t('spacingExtraSmall', { defaultValue: 'Extra Small' }),
      },
      {
        spacing: '300',
        name: t('spacingSmall', { defaultValue: 'Small' }),
      },
      {
        spacing: '400',
        name: t('spacingNormal', { defaultValue: 'Normal' }),
      },
      {
        spacing: '500',
        name: t('spacingLarge', { defaultValue: 'Large' }),
      },
    ],
    [t]
  );
};
