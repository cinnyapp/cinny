import { useMemo } from 'react';
import { MessageLayout } from '../state/settings';
import i18next from 'i18next';

export type MessageLayoutItem = {
  name: string;
  layout: MessageLayout;
};

export const useMessageLayoutItems = (): MessageLayoutItem[] =>
  useMemo(
    () => [
      {
        layout: MessageLayout.Modern,
        name: i18next.t('settingsGeneral:layoutModern', { defaultValue: 'Modern' }),
      },
      {
        layout: MessageLayout.Compact,
        name: i18next.t('settingsGeneral:layoutCompact', { defaultValue: 'Compact' }),
      },
      {
        layout: MessageLayout.Bubble,
        name: i18next.t('settingsGeneral:layoutBubble', { defaultValue: 'Bubble' }),
      },
    ],
    []
  );
