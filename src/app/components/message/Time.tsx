import React, { ComponentProps } from 'react';
import { Text, as } from 'folds';
import classNames from 'classnames';
import { timeDayMonYear, timeHourMinute, today, yesterday } from '../../utils/time';
import * as css from './Time.css';

export type TimeProps = {
  compact?: boolean;
  ts: number;
  hour24Clock: boolean;
  dateFormatString: string;
  inheritPriority?: boolean;
};

/**
 * Renders a formatted timestamp, supporting compact and full display modes.
 *
 * Displays the time in hour:minute format if the message is from today, yesterday, or if `compact` is true.
 * For older messages, it shows the date and time.
 *
 * @param {number} ts - The timestamp to display.
 * @param {boolean} [compact=false] - If true, always show only the time.
 * @param {boolean} hour24Clock - Whether to use 24-hour time format.
 * @param {string} dateFormatString - Format string for the date part.
 * @returns {React.ReactElement} A <Text as="time"> element with the formatted date/time.
 */
export const Time = as<'span', TimeProps & ComponentProps<typeof Text>>(
  ({ compact, hour24Clock, dateFormatString, ts, inheritPriority, className, ...props }, ref) => {
    const formattedTime = timeHourMinute(ts, hour24Clock);

    let time = '';
    if (compact) {
      time = formattedTime;
    } else if (today(ts)) {
      time = formattedTime;
    } else if (yesterday(ts)) {
      time = `Yesterday ${formattedTime}`;
    } else {
      time = `${timeDayMonYear(ts, dateFormatString)}, ${formattedTime}`;
    }

    return (
      <Text
        as="time"
        className={classNames(css.Time, className)}
        size="T200"
        priority={inheritPriority ? undefined : '300'}
        {...props}
        ref={ref}
      >
        {time}
      </Text>
    );
  }
);
