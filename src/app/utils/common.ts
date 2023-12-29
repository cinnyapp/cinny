import { IconName, IconSrc } from 'folds';

export const bytesToSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0KB';

  let sizeIndex = Math.floor(Math.log(bytes) / Math.log(1000));

  if (sizeIndex === 0) sizeIndex = 1;

  return `${(bytes / 1000 ** sizeIndex).toFixed(1)} ${sizes[sizeIndex]}`;
};

export const millisecondsToMinutesAndSeconds = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const mm = Math.floor(seconds / 60);
  const ss = Math.round(seconds % 60);
  return `${mm}:${ss < 10 ? '0' : ''}${ss}`;
};

export const secondsToMinutesAndSeconds = (seconds: number): string => {
  const mm = Math.floor(seconds / 60);
  const ss = Math.round(seconds % 60);
  return `${mm}:${ss < 10 ? '0' : ''}${ss}`;
};

export const getFileTypeIcon = (icons: Record<IconName, IconSrc>, fileType: string): IconSrc => {
  const type = fileType.toLowerCase();
  if (type.startsWith('audio')) {
    return icons.Play;
  }
  if (type.startsWith('video')) {
    return icons.Vlc;
  }
  if (type.startsWith('image')) {
    return icons.Photo;
  }
  return icons.File;
};

export const fulfilledPromiseSettledResult = <T>(prs: PromiseSettledResult<T>[]): T[] =>
  prs.reduce<T[]>((values, pr) => {
    if (pr.status === 'fulfilled') values.push(pr.value);
    return values;
  }, []);

export const binarySearch = <T>(items: T[], match: (item: T) => -1 | 0 | 1): T | undefined => {
  const search = (start: number, end: number): T | undefined => {
    if (start > end) return undefined;

    const mid = Math.floor((start + end) / 2);

    const result = match(items[mid]);
    if (result === 0) return items[mid];

    if (result === 1) return search(start, mid - 1);
    return search(mid + 1, end);
  };

  return search(0, items.length - 1);
};

export const randomNumberBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const scaleDimension = (inW: number, inH: number, minW: number, minH: number, maxW: number, maxH: number): {w: number, h: number} => {
  let w = Math.max(minW, Math.min(maxW, inW));
  const scaleFactor = w / inW;
  let h = Math.max(minH, scaleFactor * inH);
  if (h > maxH) {
    w = w / h * maxH;
    h = maxH;
  }
  w = Math.max(minW, Math.min(maxW, w));
  return { w, h };
}

export const parseGeoUri = (location: string) => {
  const [, data] = location.split(':');
  const [cords] = data.split(';');
  const [latitude, longitude] = cords.split(',');
  return {
    latitude,
    longitude,
  };
};
