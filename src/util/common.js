export function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return 'n/a';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  if (i === 0) return `${bytes} ${sizes[i]}`;
  return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`;
}

export function diffMinutes(dt2, dt1) {
  let diff = (dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
}

export function isNotInSameDay(dt2, dt1) {
  return (
    dt2.getDay() !== dt1.getDay()
    || dt2.getMonth() !== dt1.getMonth()
    || dt2.getYear() !== dt1.getYear()
  );
}

export function getEventCords(ev) {
  const boxInfo = ev.target.getBoundingClientRect();
  return {
    x: boxInfo.x,
    y: boxInfo.y,
    detail: ev.detail,
  };
}
