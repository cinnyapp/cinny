import { useMemo } from 'react';
import { MessageSpacing } from '../state/settings';

export type MessageSpacingItem = {
  name: string;
  spacing: MessageSpacing;
};

export const useMessageSpacingItems = (): MessageSpacingItem[] =>
  useMemo(
    () => [
      {
        spacing: '0',
        name: 'None',
      },
      {
        spacing: '100',
        name: 'Ultra Small',
      },
      {
        spacing: '200',
        name: 'Extra Small',
      },
      {
        spacing: '300',
        name: 'Small',
      },
      {
        spacing: '400',
        name: 'Normal',
      },
      {
        spacing: '500',
        name: 'Large',
      },
    ],
    []
  );
