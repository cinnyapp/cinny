import { IImageInfo } from 'matrix-js-sdk';

export const matchMxId = (id: string): RegExpMatchArray | null =>
  id.match(/^([@!$+#])(\S+):(\S+)$/);

export const validMxId = (id: string): boolean => !!matchMxId(id);

export const getMxIdServer = (userId: string): string | undefined => matchMxId(userId)?.[3];

export const getMxIdLocalPart = (userId: string): string | undefined => matchMxId(userId)?.[2];

export const isUserId = (id: string): boolean => validMxId(id) && id.startsWith('@');

export const getImageInfo = async (imageUrl: string): Promise<IImageInfo> => {
  const img = document.createElement('img');
  img.src = imageUrl;

  const res = await fetch(imageUrl);
  const blob = await res.blob();

  const info: IImageInfo = {};

  info.w = img.width;
  info.h = img.height;
  info.mimetype = blob.type;
  info.size = blob.size;
  info.thumbnail_info = { ...info };

  return info;
};
