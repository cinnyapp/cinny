import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageLayout } from '../state/settings';

export type MessageLayoutItem = {
  name: string;
  layout: MessageLayout;
};

export const useMessageLayoutItems = (): MessageLayoutItem[] => {
  const { t } = useTranslation('settingsGeneral');

  return useMemo(
    () => [
      {
        layout: MessageLayout.Modern,
        name: t('layoutModern', { defaultValue: 'Modern' }),
      },
      {
        layout: MessageLayout.Compact,
        name: t('layoutCompact', { defaultValue: 'Compact' }),
      },
      {
        layout: MessageLayout.Bubble,
        name: t('layoutBubble', { defaultValue: 'Bubble' }),
      },
    ],
    [t]
  );
};
