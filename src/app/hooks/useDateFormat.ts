import { useMemo } from 'react';
import { DateFormat } from '../state/settings';

export type DateFormatItem = {
  name: string;
  format: DateFormat;
};

export const useDateFormatItems = (): DateFormatItem[] =>
  useMemo(
    () => [
      {
        format: 'D MMM YYYY',
        name: 'D MMM YYYY',
      },
      {
        format: 'DD/MM/YYYY',
        name: 'DD/MM/YYYY',
      },
      {
        format: 'MM/DD/YYYY',
        name: 'MM/DD/YYYY',
      },
      {
        format: 'YYYY/MM/DD',
        name: 'YYYY/MM/DD',
      },
      {
        format: 'YYYY-MM-DD',
        name: 'YYYY-MM-DD',
      },
      {
        format: '',
        name: 'Custom',
      },
    ],
    []
  );
