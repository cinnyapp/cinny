import { atomFamily } from 'jotai/utils';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { TListAtom, createListAtom } from './list';
import { createUploadAtomFamily } from './upload';
import { TUploadContent } from '../utils/matrix';

export const roomUploadAtomFamily = createUploadAtomFamily();

export type TUploadItem = {
  file: TUploadContent;
  originalFile: TUploadContent;
  encInfo: EncryptedAttachmentInfo | undefined;
};

export const roomIdToUploadItemsAtomFamily = atomFamily<string, TListAtom<TUploadItem>>(
  createListAtom
);
