import type { Area } from 'react-easy-crop';
import { rotatedSize } from './cropGeometry';

export const AVATAR_SIZE = 512;

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't load the image"));
    image.src = url;
  });

const canvas2d = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported');
  return { canvas, ctx };
};

// Rotates the image, cuts out `area` (pixels of the rotated image, as react-easy-crop reports
// it) and scales it to a size × size PNG.
export const cropImage = async (
  url: string,
  area: Area,
  rotation: number,
  size = AVATAR_SIZE
): Promise<Blob> => {
  const image = await loadImage(url);
  const box = rotatedSize(image.naturalWidth, image.naturalHeight, rotation);

  const rotated = canvas2d(Math.round(box.width), Math.round(box.height));
  rotated.ctx.translate(rotated.canvas.width / 2, rotated.canvas.height / 2);
  rotated.ctx.rotate((rotation * Math.PI) / 180);
  rotated.ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const output = canvas2d(size, size);
  output.ctx.imageSmoothingQuality = 'high';
  output.ctx.drawImage(rotated.canvas, area.x, area.y, area.width, area.height, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    output.canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't create the image"))),
      'image/png'
    );
  });
};
