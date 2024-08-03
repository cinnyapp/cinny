import { encode } from 'blurhash';

export const encodeBlurHash = (
  img: HTMLImageElement | HTMLVideoElement,
  width?: number,
  height?: number
): string | undefined => {
  const imgWidth = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
  const imgHeight = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
  const canvas = document.createElement('canvas');
  canvas.width = width || imgWidth;
  canvas.height = height || imgHeight;
  const context = canvas.getContext('2d');

  if (!context) return undefined;
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  return encode(data.data, data.width, data.height, 4, 4);
};
