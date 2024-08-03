import React, { ComponentProps } from 'react';
import { Text, as } from 'folds';
import { DateTime } from '../../utils/time';

export type TimeProps = {
  compact?: boolean;
  ts: number;
  dateTime: DateTime;
};

export const Time = as<'span', TimeProps & ComponentProps<typeof Text>>(
  ({ compact, ts, dateTime, ...props }, ref) => {
    const date = new Date(ts);
    const { isToday, isYesterday, relativeTerm } = dateTime.relative(date);
    let time = '';
    if (compact || isToday) {
      time = dateTime.time(date);
    } else if (isYesterday) {
      time = `${relativeTerm}, ${dateTime.time(date)}`;
    } else {
      time = `${dateTime.dateTime(date)}`;
    }

    return (
      <Text
        as="time"
        style={{ flexShrink: 0 }}
        size="T200"
        priority="300"
        title={dateTime.full(date)}
        {...props}
        ref={ref}
      >
        {time}
      </Text>
    );
  }
);
