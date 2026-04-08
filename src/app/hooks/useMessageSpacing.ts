import { useMemo } from 'react';
import { MessageSpacing } from '../state/settings';
import i18next from 'i18next';

export type MessageSpacingItem = {
  name: string;
  spacing: MessageSpacing;
};

export const useMessageSpacingItems = (): MessageSpacingItem[] =>
  useMemo(
    () => [
      {
        spacing: '0',
        name: i18next.t('settingsGeneral:spacingNone', { defaultValue: 'None' }),
      },
      {
        spacing: '100',
        name: i18next.t('settingsGeneral:spacingUltraSmall', { defaultValue: 'Ultra Small' }),
      },
      {
        spacing: '200',
        name: i18next.t('settingsGeneral:spacingExtraSmall', { defaultValue: 'Extra Small' }),
      },
      {
        spacing: '300',
        name: i18next.t('settingsGeneral:spacingSmall', { defaultValue: 'Small' }),
      },
      {
        spacing: '400',
        name: i18next.t('settingsGeneral:spacingNormal', { defaultValue: 'Normal' }),
      },
      {
        spacing: '500',
        name: i18next.t('settingsGeneral:spacingLarge', { defaultValue: 'Large' }),
      },
    ],
    []
  );
