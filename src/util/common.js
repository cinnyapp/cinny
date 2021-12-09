/* eslint-disable max-classes-per-file */
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

export function isInSameDay(dt2, dt1) {
  return (
    dt2.getFullYear() === dt1.getFullYear()
    && dt2.getMonth() === dt1.getMonth()
    && dt2.getDate() === dt1.getDate()
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

export function abbreviateNumber(number) {
  if (number > 99) return '99+';
  return number;
}

export class Debounce {
  constructor() {
    this.timeoutId = null;
  }

  /**
   * @param {function} func - callback function
   * @param {number} wait - wait in milliseconds to call func
   * @returns {func} debounceCallback - to pass arguments to func callback
   */
  _(func, wait) {
    const that = this;
    return function debounceCallback(...args) {
      clearTimeout(that.timeoutId);
      that.timeoutId = setTimeout(() => {
        func.apply(this, args);
        that.timeoutId = null;
      }, wait);
    };
  }
}

export class Throttle {
  constructor() {
    this.timeoutId = null;
  }

  /**
   * @param {function} func - callback function
   * @param {number} wait - wait in milliseconds to call func
   * @returns {function} throttleCallback - to pass arguments to func callback
   */
  _(func, wait) {
    const that = this;
    return function throttleCallback(...args) {
      if (that.timeoutId !== null) return;
      that.timeoutId = setTimeout(() => {
        func.apply(this, args);
        that.timeoutId = null;
      }, wait);
    };
  }
}

export function getUrlPrams(paramName) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get(paramName);
}

export function getScrollInfo(target) {
  const scroll = {};
  scroll.top = Math.round(target.scrollTop);
  scroll.height = Math.round(target.scrollHeight);
  scroll.viewHeight = Math.round(target.offsetHeight);
  scroll.isScrollable = scroll.height > scroll.viewHeight;
  return scroll;
}
