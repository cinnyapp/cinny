import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { Descendant } from 'slate';
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

export type RoomIdToMsgAction =
  | {
      type: 'PUT';
      roomId: string;
      msg: Descendant[];
    }
  | {
      type: 'DELETE';
      roomId: string;
    };

const createMsgDraftAtom = () => atom<Descendant[]>([]);
export type TMsgDraftAtom = ReturnType<typeof createMsgDraftAtom>;
export const roomIdToMsgDraftAtomFamily = atomFamily<string, TMsgDraftAtom>(() =>
  createMsgDraftAtom()
);
