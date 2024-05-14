import React from 'react';
import { Text, as } from 'folds';
import { timeDayMonYear, timeHourMinute, today, yesterday } from '../../utils/time';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';

export type TimeProps = {
  compact?: boolean;
  ts: number;
};

export const Time = as<'span', TimeProps>(({ compact, ts, ...props }, ref) => {
  const [useInternationalTime] = useSetting(settingsAtom, 'useInternationalTime');
  const formattedTime = timeHourMinute(ts, useInternationalTime);

  let time = '';

  if (compact) {
    time = formattedTime;
  } else if (today(ts)) {
    time = formattedTime;
  } else if (yesterday(ts)) {
    time = `Yesterday ${formattedTime}`;
  } else {
    time = `${timeDayMonYear(ts)} ${formattedTime}`;
  }

  return (
    <Text as="time" style={{ flexShrink: 0 }} size="T200" priority="300" {...props} ref={ref}>
      {time}
    </Text>
  );
});
