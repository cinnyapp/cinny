import dayjs from 'dayjs';
import 'dayjs/locale/de';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import i18next from 'i18next';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

i18next.on('languageChanged', (lng) => {
  dayjs.locale(lng);
});

export const today = (ts: number): boolean => dayjs(ts).isToday();

export const yesterday = (ts: number): boolean => dayjs(ts).isYesterday();

export const timeDayMonYear = (ts: number): string => dayjs(ts).format('D MMM YYYY');

export const timeDayMonthYear = (ts: number): string => dayjs(ts).format('D MMMM YYYY');

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
