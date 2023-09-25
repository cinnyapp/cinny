import React from 'react';

import { isInSameDay, DateTime } from '../../utils/time';

interface TimeProps {
  timestamp: number;
  fullTime?: boolean;
}

function Time({ timestamp, fullTime }: TimeProps) {
  const date = new Date(timestamp);

  const formattedFullTime = DateTime.full(date);
  let formattedDate = formattedFullTime;

  if (!fullTime) {
    const compareDate = new Date();
    const isToday = isInSameDay(date, compareDate);
    compareDate.setDate(compareDate.getDate() - 1);
    const isYesterday = isInSameDay(date, compareDate);

    formattedDate = isToday || isYesterday ? DateTime.time(date) : DateTime.dateISO(date);
    if (isYesterday) {
      const yesterday = DateTime.relative(-1, 'day') ?? 'Yesterday';
      formattedDate = `${yesterday}, ${formattedDate}`;
    }
  }

  return (
    <time dateTime={date.toISOString()} title={formattedFullTime}>
      {formattedDate}
    </time>
  );
}

export default Time;
