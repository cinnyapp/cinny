import { useEffect, useState } from 'react';
import { settingsAtom } from '../state/settings';
import { useSetting } from '../state/hooks/settings.js';

// Potentially unsafe for astral codepoints.
function capitalize(str: string) {
  return str[0].toLocaleUpperCase() + str.slice(1);
}

export const isSameDay = (d1: Date, d2: Date): boolean => d2.toDateString() === d1.toDateString();

export const minuteDifference = (d1: Date, d2: Date): number => {
  let diff = (d1.getTime() - d2.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
};

const locale = 'en-in';

export class DateTime {
  // eslint-disable-next-line no-use-before-define
  private static instance: DateTime;

  private static hour12: boolean;

  private dateFormat: Intl.DateTimeFormat;

  private timeFormat: Intl.DateTimeFormat;

  private dateTimeFormat: Intl.DateTimeFormat;

  private fullFormat: Intl.DateTimeFormat;

  private relativeFormat: Intl.RelativeTimeFormat;

  private constructor(hour12: boolean) {
    DateTime.hour12 = hour12;

    this.dateFormat = new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
    });
    this.timeFormat = new Intl.DateTimeFormat(locale, {
      hour12,
      timeStyle: 'short',
    });
    this.dateTimeFormat = new Intl.DateTimeFormat(locale, {
      hour12,
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    this.fullFormat = new Intl.DateTimeFormat(locale, {
      hour12,
      dateStyle: 'full',
      timeStyle: 'medium',
    });
    this.relativeFormat = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  }

  static getInstance(hour12: boolean): DateTime {
    if (hour12 !== DateTime.hour12) {
      DateTime.instance = new DateTime(hour12);
    }
    return DateTime.instance;
  }

  date(date: Date | number): string {
    return this.dateFormat.format(date);
  }

  time(date: Date | number): string {
    return this.timeFormat.format(date);
  }

  dateTime(date: Date | number): string {
    return this.dateTimeFormat.format(date);
  }

  full(date: Date | number): string {
    return this.fullFormat.format(date);
  }

  relative(date: Date) {
    const today = new Date();
    const isToday = isSameDay(today, date);
    let yesterday: Date;
    let isYesterday: boolean;
    let relativeTerm: string;
    if (!isToday) {
      yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      isYesterday = isSameDay(yesterday, date);
    } else {
      isYesterday = false;
    }
    if (isToday) relativeTerm = this.relativeFormat.format(0, 'day');
    else if (isYesterday) relativeTerm = this.relativeFormat.format(-1, 'day');
    else relativeTerm = '';
    if (relativeTerm) relativeTerm = capitalize(relativeTerm);

    return { isToday, isYesterday, relativeTerm };
  }
}

export function useDateTime() {
  const [hour12] = useSetting(settingsAtom, 'hour12');
  const [dateTime, setDateTime] = useState(() => DateTime.getInstance(hour12));
  useEffect(() => {
    setDateTime(DateTime.getInstance(hour12));
  }, [hour12]);
  return dateTime;
}
