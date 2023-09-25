import cons from '../../client/state/cons';
import settings from '../../client/state/settings';

function capitalize(string: string) {
  return string.charAt(0).toLocaleUpperCase() + string.slice(1);
}

const hourCycle = () => (settings.isTime12 ? 'h12' : 'h23');

let fullFormat: Intl.DateTimeFormat;
let dateFormat: Intl.DateTimeFormat;
let timeFormat: Intl.DateTimeFormat;
let relativeFormat: Intl.RelativeTimeFormat | undefined;

function initDateFormats() {
  fullFormat = new Intl.DateTimeFormat('en', {
    hourCycle: hourCycle(),
    dateStyle: 'full',
    timeStyle: 'short',
  });

  dateFormat = new Intl.DateTimeFormat('en', {
    dateStyle: 'long',
  });

  timeFormat = new Intl.DateTimeFormat('en', {
    hourCycle: hourCycle(),
    hour: 'numeric',
    minute: 'numeric',
  });

  relativeFormat = Intl.RelativeTimeFormat
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : undefined;
}
initDateFormats();

export class DateTime {
  static full = (date: Date) => fullFormat.format(date);

  static date = (date: Date) => dateFormat.format(date);

  static time = (date: Date) => timeFormat.format(date);

  static relative = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
    relativeFormat ? capitalize(relativeFormat.format(value, unit)) : undefined;

  static dateISO = (date: Date) => date.toISOString().split('T')[0];
}

export function diffMinutes(dt2: Date, dt1: Date): number {
  let diff = (dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
}

export function isInSameDay(dt2: Date, dt1: Date): boolean {
  return (
    dt2.getFullYear() === dt1.getFullYear() &&
    dt2.getMonth() === dt1.getMonth() &&
    dt2.getDate() === dt1.getDate()
  );
}

settings.on(cons.events.settings.TIME12_TOGGLED, () => {
  initDateFormats();
});
