import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';

export type IImageInfo = {
  w?: number;
  h?: number;
  mimetype?: string;
  size?: number;
};

export type IVideoInfo = IImageInfo & {
  duration?: number;
};

export type IEncryptedFile = EncryptedAttachmentInfo & {
  url: string;
};

export type IThumbnailContent = {
  thumbnail_info?: IImageInfo;
  thumbnail_file?: IEncryptedFile;
  thumbnail_url?: string;
};
