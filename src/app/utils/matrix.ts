import { EncryptedAttachmentInfo, encryptAttachment } from 'browser-encrypt-attachment';
import { MatrixClient, MatrixError, UploadProgress, UploadResponse } from 'matrix-js-sdk';
import { IImageInfo, IThumbnailContent, IVideoInfo } from '../../types/matrix/common';

export const matchMxId = (id: string): RegExpMatchArray | null =>
  id.match(/^([@!$+#])(\S+):(\S+)$/);

export const validMxId = (id: string): boolean => !!matchMxId(id);

export const getMxIdServer = (userId: string): string | undefined => matchMxId(userId)?.[3];

export const getMxIdLocalPart = (userId: string): string | undefined => matchMxId(userId)?.[2];

export const isUserId = (id: string): boolean => validMxId(id) && id.startsWith('@');

export const getImageInfo = (img: HTMLImageElement, fileOrBlob: File | Blob): IImageInfo => {
  const info: IImageInfo = {};
  info.w = img.width;
  info.h = img.height;
  info.mimetype = fileOrBlob.type;
  info.size = fileOrBlob.size;
  return info;
};

export const getVideoInfo = (video: HTMLVideoElement, fileOrBlob: File | Blob): IVideoInfo => {
  const info: IVideoInfo = {};
  info.duration = Number.isNaN(video.duration) ? undefined : video.duration;
  info.w = video.videoWidth;
  info.h = video.videoHeight;
  info.mimetype = fileOrBlob.type;
  info.size = fileOrBlob.size;
  return info;
};

export const getThumbnailContent = (thumbnailInfo: {
  thumbnail: File | Blob;
  encInfo: EncryptedAttachmentInfo | undefined;
  mxc: string;
  width: number;
  height: number;
}): IThumbnailContent => {
  const { thumbnail, encInfo, mxc, width, height } = thumbnailInfo;

  const content: IThumbnailContent = {
    thumbnail_info: {
      mimetype: thumbnail.type,
      size: thumbnail.size,
      w: width,
      h: height,
    },
  };
  if (encInfo) {
    content.thumbnail_file = {
      ...encInfo,
      url: mxc,
    };
  } else {
    content.thumbnail_url = mxc;
  }
  return content;
};

export const encryptFile = async (
  file: File | Blob
): Promise<{
  encInfo: EncryptedAttachmentInfo;
  file: File;
  originalFile: File | Blob;
}> => {
  const dataBuffer = await file.arrayBuffer();
  const encryptedAttachment = await encryptAttachment(dataBuffer);
  const encFile = new File([encryptedAttachment.data], file.name, {
    type: file.type,
  });
  return {
    encInfo: encryptedAttachment.info,
    file: encFile,
    originalFile: file,
  };
};

export type TUploadContent = File | Blob;

export type ContentUploadOptions = {
  name?: string;
  fileType?: string;
  hideFilename?: boolean;
  onPromise?: (promise: Promise<UploadResponse>) => void;
  onProgress?: (progress: UploadProgress) => void;
  onSuccess: (mxc: string) => void;
  onError: (error: MatrixError) => void;
};

export const uploadContent = async (
  mx: MatrixClient,
  file: TUploadContent,
  options: ContentUploadOptions
) => {
  const { name, fileType, hideFilename, onProgress, onPromise, onSuccess, onError } = options;

  const uploadPromise = mx.uploadContent(file, {
    name,
    type: fileType,
    includeFilename: !hideFilename,
    progressHandler: onProgress,
  });
  onPromise?.(uploadPromise);
  try {
    const data = await uploadPromise;
    const mxc = data.content_uri;
    if (mxc) onSuccess(mxc);
    else onError(new MatrixError(data));
  } catch (e: any) {
    const error = typeof e?.message === 'string' ? e.message : undefined;
    const errcode = typeof e?.name === 'string' ? e.message : undefined;
    onError(new MatrixError({ error, errcode }));
  }
};
