import { IContent, MatrixClient, MsgType } from 'matrix-js-sdk';
import to from 'await-to-js';
import { IThumbnailContent, MATRIX_BLUR_HASH_PROPERTY_NAME } from '../../../types/matrix/common';
import {
  getImageFileUrl,
  getThumbnail,
  getThumbnailDimensions,
  getVideoFileUrl,
  loadImageElement,
  loadVideoElement,
} from '../../utils/dom';
import { encryptFile, getImageInfo, getThumbnailContent, getVideoInfo } from '../../utils/matrix';
import { TUploadItem } from '../../state/roomInputDrafts';
import { encodeBlurHash } from '../../utils/blurHash';
import { scaleDimension } from '../../utils/common';

const generateThumbnailContent = async (
  mx: MatrixClient,
  img: HTMLImageElement | HTMLVideoElement,
  dimensions: [number, number],
  encrypt: boolean
): Promise<IThumbnailContent> => {
  const thumbnail = await getThumbnail(img, ...dimensions);
  if (!thumbnail) throw new Error('Can not create thumbnail!');
  const encThumbData = encrypt ? await encryptFile(thumbnail) : undefined;
  const thumbnailFile = encThumbData?.file ?? thumbnail;
  if (!thumbnailFile) throw new Error('Can not create thumbnail!');

  const data = await mx.uploadContent(thumbnailFile);
  const thumbMxc = data?.content_uri;
  if (!thumbMxc) throw new Error('Failed when uploading thumbnail!');
  const thumbnailContent = getThumbnailContent({
    thumbnail: thumbnailFile,
    encInfo: encThumbData?.encInfo,
    mxc: thumbMxc,
    width: dimensions[0],
    height: dimensions[1],
  });
  return thumbnailContent;
};

export const getImageMsgContent = async (
  mx: MatrixClient,
  item: TUploadItem,
  mxc: string
): Promise<IContent> => {
  const { file, originalFile, encInfo } = item;
  const [imgError, imgEl] = await to(loadImageElement(getImageFileUrl(originalFile)));
  if (imgError) console.warn(imgError);

  const content: IContent = {
    msgtype: MsgType.Image,
    body: file.name,
  };
  if (imgEl) {
    const dim = scaleDimension(imgEl.width, imgEl.height, 32, 32, 512, 512);
    const blurHash = encodeBlurHash(imgEl, dim.w, dim.h);

    content.info = {
      ...getImageInfo(imgEl, file),
      [MATRIX_BLUR_HASH_PROPERTY_NAME]: blurHash,
    };
  }
  if (encInfo) {
    content.file = {
      ...encInfo,
      url: mxc,
    };
  } else {
    content.url = mxc;
  }
  return content;
};

export const getVideoMsgContent = async (
  mx: MatrixClient,
  item: TUploadItem,
  mxc: string
): Promise<IContent> => {
  const { file, originalFile, encInfo } = item;

  const [videoError, videoEl] = await to(loadVideoElement(getVideoFileUrl(originalFile)));
  if (videoError) console.warn(videoError);

  const content: IContent = {
    msgtype: MsgType.Video,
    body: file.name,
  };
  if (videoEl) {
    const [thumbError, thumbContent] = await to(
      generateThumbnailContent(
        mx,
        videoEl,
        getThumbnailDimensions(videoEl.videoWidth, videoEl.videoHeight),
        !!encInfo
      )
    );
    if (thumbContent && thumbContent.thumbnail_info) {
      const dim = scaleDimension(videoEl.width, videoEl.height, 32, 32, 512, 512);
      thumbContent.thumbnail_info[MATRIX_BLUR_HASH_PROPERTY_NAME] = encodeBlurHash(
        videoEl,
        dim.w,
        dim.h,
      );
    }
    if (thumbError) console.warn(thumbError);
    content.info = {
      ...getVideoInfo(videoEl, file),
      ...thumbContent,
    };
  }
  if (encInfo) {
    content.file = {
      ...encInfo,
      url: mxc,
    };
  } else {
    content.url = mxc;
  }
  return content;
};

export const getAudioMsgContent = (item: TUploadItem, mxc: string): IContent => {
  const { file, encInfo } = item;
  const content: IContent = {
    msgtype: MsgType.Audio,
    body: file.name,
    info: {
      mimetype: file.type,
      size: file.size,
    },
  };
  if (encInfo) {
    content.file = {
      ...encInfo,
      url: mxc,
    };
  } else {
    content.url = mxc;
  }
  return content;
};

export const getFileMsgContent = (item: TUploadItem, mxc: string): IContent => {
  const { file, encInfo } = item;
  const content: IContent = {
    msgtype: MsgType.File,
    body: file.name,
    filename: file.name,
    info: {
      mimetype: file.type,
      size: file.size,
    },
  };
  if (encInfo) {
    content.file = {
      ...encInfo,
      url: mxc,
    };
  } else {
    content.url = mxc;
  }
  return content;
};
