import React from 'react';
import { Text, as } from 'folds';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { timeDayMonYear, today, yesterday } from '../../utils/time';

export type TimeProps = {
  compact?: boolean;
  ts: number;
};

export const Time = as<'span', TimeProps>(({ compact, ts, ...props }, ref) => {
  const { t } = useTranslation();

  const timeHourMinute = dayjs(ts).format(t('Time.timeHourMinute'));

  let time = '';
  if (compact || today(ts)) {
    time = timeHourMinute;
  } else if (yesterday(ts)) {
    time = `${t('Time.yesterday')} ${timeHourMinute}`;
  } else {
    time = `${timeDayMonYear(ts)} ${timeHourMinute}`;
  }

  return (
    <Text as="time" style={{ flexShrink: 0 }} size="T200" priority="300" {...props} ref={ref}>
      {time}
    </Text>
  );
});
