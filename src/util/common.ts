/* eslint-disable max-classes-per-file */
export function bytesToSize(bytes: number) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return 'n/a';
  const i = Math.floor(Math.floor(Math.log(bytes) / Math.log(1024)));
  if (i === 0) return `${bytes} ${sizes[i]}`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

export function diffMinutes(dt2: { getTime: () => number }, dt1: { getTime: () => number }) {
  let diff = (dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
}

export function isInSameDay(dt2: Date, dt1: Date) {
  return (
    dt2.getFullYear() === dt1.getFullYear() &&
    dt2.getMonth() === dt1.getMonth() &&
    dt2.getDate() === dt1.getDate()
  );
}

/**
 * @param {Event} ev
 * @param {string} [targetSelector] element selector for Element.matches([selector])
 */
export function getEventCords(ev: Event, targetSelector: string) {
  let boxInfo: DOMRect;

  const path = ev.composedPath();
  const target = targetSelector
    ? path.find((element) => (element as HTMLElement).matches?.(targetSelector))
    : null;
  if (target) {
    boxInfo = (target as HTMLElement).getBoundingClientRect();
  } else {
    boxInfo = (ev.target as HTMLElement).getBoundingClientRect();
  }

  return {
    x: boxInfo.x,
    y: boxInfo.y,
    width: boxInfo.width,
    height: boxInfo.height,
    detail: (ev as MouseEvent).detail,
  };
}

export function abbreviateNumber(number: number) {
  if (number > 99) return '99+';
  return number;
}

export class Debounce {
  timeoutId: any;

  constructor() {
    this.timeoutId = null;
  }

  /**
   * @param {function} func - callback function
   * @param {number} wait - wait in milliseconds to call func
   * @returns {func} debounceCallback - to pass arguments to func callback
   */
  _(func: (...args) => void, wait: number) {
    const debounceCallback = (...args) => {
      clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => {
        func(args);
        this.timeoutId = null;
      }, wait);
    };
    return debounceCallback;
  }
}

export class Throttle {
  timeoutId: any;

  constructor() {
    this.timeoutId = null;
  }

  /**
   * @param {function} func - callback function
   * @param {number} wait - wait in milliseconds to call func
   * @returns {function} throttleCallback - to pass arguments to func callback
   */
  _(func: (...args) => void, wait: number) {
    const throttleCallback = (...args) => {
      if (this.timeoutId !== null) return;
      this.timeoutId = setTimeout(() => {
        func(args);
        this.timeoutId = null;
      }, wait);
    };
    return throttleCallback;
  }
}

export function getUrlPrams(paramName: string) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get(paramName);
}

export function getScrollInfo(target: HTMLElement) {
  const scroll = {
    top: Math.round(target.scrollTop),
    height: Math.round(target.scrollHeight),
    viewHeight: Math.round(target.offsetHeight),
    isScrollable: undefined,
  };
  scroll.isScrollable = scroll.height > scroll.viewHeight;
  return scroll;
}

export function avatarInitials(text) {
  return [...text][0];
}

export function cssVar(name: string) {
  return getComputedStyle(document.body).getPropertyValue(name);
}

export function setFavicon(url: string) {
  const favicon = document.querySelector('#favicon');
  if (!favicon) return;
  favicon.setAttribute('href', url);
}

export function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const host = document.body;
    const copyInput = document.createElement('input');
    copyInput.style.position = 'fixed';
    copyInput.style.opacity = '0';
    copyInput.value = text;
    host.append(copyInput);

    copyInput.select();
    copyInput.setSelectionRange(0, 99999);
    document.execCommand('Copy');
    copyInput.remove();
  }
}

export function suffixRename(name: string, validator: (newName: string) => boolean) {
  let suffix = 2;
  let newName = name;
  do {
    newName = `name${suffix}`;
    suffix += 1;
  } while (validator(newName));

  return newName;
}

export function getImageDimension(file: Blob | MediaSource) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      resolve({
        w: img.width,
        h: img.height,
      });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

export function scaleDownImage(imageFile: Blob, width: number, height: number) {
  return new Promise((resolve) => {
    const imgURL = URL.createObjectURL(imageFile);
    const img = new Image();

    img.onload = () => {
      let newWidth = img.width;
      let newHeight = img.height;
      if (newHeight <= height && newWidth <= width) {
        resolve(imageFile);
      }

      if (newHeight > height) {
        newWidth = Math.floor(newWidth * (height / newHeight));
        newHeight = height;
      }
      if (newWidth > width) {
        newHeight = Math.floor(newHeight * (width / newWidth));
        newWidth = width;
      }

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob((thumbnail) => {
        URL.revokeObjectURL(imgURL);
        resolve(thumbnail);
      }, imageFile.type);
    };

    img.src = imgURL;
  });
}

/**
 * @param {sigil} string sigil to search for (for example '@', '#' or '$')
 * @param {flags} string regex flags
 * @param {prefix} string prefix appended at the beginning of the regex
 * @returns {RegExp}
 */
export function idRegex(sigil: string, flags: string, prefix: string): RegExp {
  const servername = '(?:[a-zA-Z0-9-.]*[a-zA-Z0-9]+|\\[\\S+?\\])(?::\\d+)?';
  return new RegExp(`${prefix}(${sigil}\\S+:${servername})`, flags);
}

const matrixToRegex = /^https?:\/\/matrix.to\/#\/(\S+:\S+)/;
/**
 * Parses a matrix.to URL into an matrix id.
 * This function can later be extended to support matrix: URIs
 * @param {string} uri The URI to parse
 * @returns {string|null} The id or null if the URI does not match
 */
export function parseIdUri(uri: string): string | null {
  const res = decodeURIComponent(uri).match(matrixToRegex);
  if (!res) return null;
  return res[1];
}
