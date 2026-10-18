import {
  EncryptedAttachmentInfo,
  decryptAttachment,
  encryptAttachment,
} from 'browser-encrypt-attachment';
import to from 'await-to-js';
import { putAccountData } from 'neurone/lib/api/matrix/client/v3/user';
import { MatrixError } from 'neurone/lib/matrix-request';
import { IImageInfo, IThumbnailContent, IVideoInfo } from '../../types/matrix/common';
import { AccountDataType } from '../../types/matrix/accountData';
import { ClientContext } from '../../client/context';
import { JoinRoomMemberObject } from '../../client/storage/collections';
import { rError } from '../../client/reader';

const DOMAIN_REGEX = /\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/;

export const isServerName = (serverName: string): boolean => DOMAIN_REGEX.test(serverName);

const matchMxId = (id: string): RegExpMatchArray | null => id.match(/^([@$+#])([^\s:]+):(\S+)$/);

const validMxId = (id: string): boolean => !!matchMxId(id);

export const getMxIdServer = (userId: string): string | undefined => matchMxId(userId)?.[3];

export const getMxIdLocalPart = (userId: string): string | undefined => matchMxId(userId)?.[2];

export const isUserId = (id: string): boolean => validMxId(id) && id.startsWith('@');

export const isRoomId = (id: string): boolean => id.startsWith('!');

export const isRoomAlias = (id: string): boolean => validMxId(id) && id.startsWith('#');

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
  info.duration = Number.isNaN(video.duration) ? undefined : Math.floor(video.duration * 1000);
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
  const encFile = new File(
    [encryptedAttachment.data],
    file instanceof File ? file.name : 'Untitled',
    {
      type: file.type,
    }
  );
  return {
    encInfo: encryptedAttachment.info,
    file: encFile,
    originalFile: file,
  };
};

export const decryptFile = async (
  dataBuffer: ArrayBuffer,
  type: string,
  encInfo: EncryptedAttachmentInfo
): Promise<Blob> => {
  const dataArray = await decryptAttachment(dataBuffer, encInfo);
  const blob = new Blob([dataArray], { type });
  return blob;
};

export type UploadContent = File | Blob;

export const getUserDirectRooms = (ct: ClientContext, userId: string): string[] => {
  const rooms = Object.keys(ct.roomToSummary.read);
  const directRooms = rooms.filter((roomId) => {
    const summary = ct.roomToSummary.read.get(roomId);
    const heroes = summary?.['m.heroes'];
    return (
      Array.isArray(heroes) &&
      heroes.length === 1 &&
      heroes[1] === userId &&
      ct.directRooms.read.has(roomId)
    );
  });

  return directRooms;
};

export const guessDmRoomUserId = (members: JoinRoomMemberObject[], myUserId: string): string => {
  let oldestMemberTs: number | undefined;
  let oldestMember: JoinRoomMemberObject | undefined;

  const pickOldestMember = (member: JoinRoomMemberObject) => {
    if (member.userId === myUserId) return;

    if (oldestMemberTs === undefined || member.event.origin_server_ts < oldestMemberTs) {
      oldestMember = member;
      oldestMemberTs = member.event.origin_server_ts;
    }
  };

  members.forEach(pickOldestMember);

  return oldestMember?.userId ?? myUserId;
};

const getUserIdToRoomIds = (content?: Record<string, unknown>): Record<string, string[]> => {
  const userIdToRoomIds: Record<string, string[]> = {};

  if (typeof content === 'object' && content) {
    Object.keys(content).forEach((uId) => {
      const roomIds = content[uId];
      if (Array.isArray(roomIds)) {
        userIdToRoomIds[uId] = roomIds.filter((rId) => typeof rId === 'string');
      }
    });
  }
  return userIdToRoomIds;
};
export const addRoomIdToMDirect = async (
  ct: ClientContext,
  roomId: string,
  userId: string
): Promise<void> => {
  const mDirectsEventObj = await ct.storage.accountData.read.get(AccountDataType.Direct);
  const content = mDirectsEventObj?.event.content as Record<string, unknown> | undefined;
  const userIdToRoomIds = getUserIdToRoomIds(content);

  // remove it from the lists of any others users
  // (it can only be a DM room for one person)
  Object.keys(userIdToRoomIds).forEach((targetUserId) => {
    const roomIds = userIdToRoomIds[targetUserId];

    if (targetUserId !== userId) {
      const indexOfRoomId = roomIds.indexOf(roomId);
      if (indexOfRoomId > -1) {
        roomIds.splice(indexOfRoomId, 1);
      }
    }
  });

  const roomIds = userIdToRoomIds[userId] || [];
  if (roomIds.indexOf(roomId) === -1) {
    roomIds.push(roomId);
  }
  userIdToRoomIds[userId] = roomIds;

  await ct.requestAuthJSON(
    putAccountData({
      pathParams: { userId: ct.session.userId, type: AccountDataType.Direct },
      body: userIdToRoomIds,
    })
  );
};

export const removeRoomIdFromMDirect = async (ct: ClientContext, roomId: string): Promise<void> => {
  const mDirectsEventObj = await ct.storage.accountData.read.get(AccountDataType.Direct);
  const content = mDirectsEventObj?.event.content as Record<string, unknown> | undefined;
  const userIdToRoomIds = getUserIdToRoomIds(content);

  Object.keys(userIdToRoomIds).forEach((targetUserId) => {
    const roomIds = userIdToRoomIds[targetUserId];
    const indexOfRoomId = roomIds.indexOf(roomId);
    if (indexOfRoomId > -1) {
      roomIds.splice(indexOfRoomId, 1);
    }
  });

  await ct.requestAuthJSON(
    putAccountData({
      pathParams: { userId: ct.session.userId, type: AccountDataType.Direct },
      body: userIdToRoomIds,
    })
  );
};

export const downloadMedia = async (src: string): Promise<Blob> => {
  // this request is authenticated by service worker
  const res = await fetch(src, { method: 'GET' });
  const blob = await res.blob();
  return blob;
};

export const downloadEncryptedMedia = async (
  src: string,
  decryptContent: (buf: ArrayBuffer) => Promise<Blob>
): Promise<Blob> => {
  const encryptedContent = await downloadMedia(src);
  const decryptedContent = await decryptContent(await encryptedContent.arrayBuffer());

  return decryptedContent;
};

export const rateLimitedActions = async <T>(
  data: T[],
  callback: (item: T, index: number) => Promise<MatrixError | undefined>,
  maxRetryCount?: number
) => {
  let retryCount = 0;

  let actionInterval = 0;

  const sleepForMs = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const performAction = async (dataItem: T, index: number) => {
    const [, err] = await to<MatrixError | undefined>(callback(dataItem, index));

    if (err?.status === 429) {
      if (retryCount === maxRetryCount) {
        return;
      }

      const retryAfterMs = rError.retryAfterMs(err.data) ?? undefined;
      const waitMS = retryAfterMs ?? 3000;
      actionInterval = waitMS * 1.5;
      await sleepForMs(waitMS);
      retryCount += 1;

      await performAction(dataItem, index);
    }
  };

  for (let i = 0; i < data.length; i += 1) {
    const dataItem = data[i];
    retryCount = 0;
    // eslint-disable-next-line no-await-in-loop
    await performAction(dataItem, i);
    if (actionInterval > 0) {
      // eslint-disable-next-line no-await-in-loop
      await sleepForMs(actionInterval);
    }
  }
};

export const knockSupported = (version: string): boolean => {
  const unsupportedVersion = ['1', '2', '3', '4', '5', '6'];
  return !unsupportedVersion.includes(version);
};
export const restrictedSupported = (version: string): boolean => {
  const unsupportedVersion = ['1', '2', '3', '4', '5', '6', '7'];
  return !unsupportedVersion.includes(version);
};
export const knockRestrictedSupported = (version: string): boolean => {
  const unsupportedVersion = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return !unsupportedVersion.includes(version);
};
export const creatorsSupported = (version: string): boolean => {
  const unsupportedVersion = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
  return !unsupportedVersion.includes(version);
};
