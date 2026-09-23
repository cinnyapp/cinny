import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

export const today = (ts: number): boolean => dayjs(ts).isToday();

export const yesterday = (ts: number): boolean => dayjs(ts).isYesterday();

export const timeHour = (ts: number, hour24Clock: boolean): string =>
  dayjs(ts).format(hour24Clock ? 'HH' : 'hh');
export const timeMinute = (ts: number): string => dayjs(ts).format('mm');
export const timeAmPm = (ts: number): string => dayjs(ts).format('A');
export const timeDay = (ts: number): string => dayjs(ts).format('D');
export const timeMon = (ts: number): string => dayjs(ts).format('MMM');
export const timeMonth = (ts: number): string => dayjs(ts).format('MMMM');
export const timeYear = (ts: number): string => dayjs(ts).format('YYYY');

export const timeHourMinute = (ts: number, hour24Clock: boolean): string =>
  dayjs(ts).format(hour24Clock ? 'HH:mm' : 'hh:mm A');

export const timeHourMinuteSecond = (ts: number, hour24Clock: boolean): string =>
  dayjs(ts).format(hour24Clock ? 'HH:mm:ss' : 'hh:mm A');

export const timeDayMonYear = (ts: number, dateFormatString: string): string =>
  dayjs(ts).format(dateFormatString);

export const timeDayMonthYear = (ts: number): string => dayjs(ts).format('D MMMM YYYY');

export const daysInMonth = (month: number, year: number): number =>
  dayjs(`${year}-${month}-1`).daysInMonth();

export const dateFor = (year: number, month: number, day: number): number =>
  dayjs(`${year}-${month}-${day}`).valueOf();

export const inSameDay = (ts1: number, ts2: number): boolean => {
  const dt1 = new Date(ts1);
  const dt2 = new Date(ts2);
  return (
    dt2.getFullYear() === dt1.getFullYear() &&
    dt2.getMonth() === dt1.getMonth() &&
    dt2.getDate() === dt1.getDate()
  );
};

export const minuteDifference = (ts1: number, ts2: number): number => {
  const dt1 = new Date(ts1);
  const dt2 = new Date(ts2);

  let diff = (dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
};

export const hour24to12 = (hour24: number): number => {
  const h = hour24 % 12;

  if (h === 0) return 12;
  return h;
};

export const hour12to24 = (hour: number, pm: boolean): number => {
  if (hour === 12) {
    return pm ? 12 : 0;
  }
  return pm ? hour + 12 : hour;
};

export const secondsToMs = (seconds: number) => seconds * 1000;

export const minutesToMs = (minutes: number) => minutes * secondsToMs(60);

export const hoursToMs = (hour: number) => hour * minutesToMs(60);

export const daysToMs = (days: number) => days * hoursToMs(24);

export const getToday = () => {
  const nowTs = Date.now();
  const date = dayjs(nowTs);
  return dateFor(date.year(), date.month() + 1, date.date());
};

export const getYesterday = () => {
  const nowTs = Date.now() - daysToMs(1);
  const date = dayjs(nowTs);
  return dateFor(date.year(), date.month() + 1, date.date());
};
