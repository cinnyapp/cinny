import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { Descendant } from 'slate';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { createUploadContentToUploadAtom } from '../upload';
import { UploadContent } from '../../utils/matrix';
import { createListAtom } from '../list';

export const getComposerId = (roomId: string, threadId?: string) => `${roomId}${threadId ?? ''}`;

export type UploadMetadata = {
  markedAsSpoiler: boolean;
};

export type UploadItem = {
  file: UploadContent;
  originalFile: UploadContent;
  metadata: UploadMetadata;
  encInfo: EncryptedAttachmentInfo | undefined;
};
export type UploadListAtom = ReturnType<typeof createListAtom<UploadItem>>;
export const composerToUploadItemsAtom = atomFamily<string, UploadListAtom>(createListAtom);

export const roomUploadContentToUploadAtom = createUploadContentToUploadAtom();

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

const createDraftAtom = () => atom<Descendant[] | undefined>(undefined);
export type DraftAtom = ReturnType<typeof createDraftAtom>;
export const composerToDraftAtom = atomFamily<string, DraftAtom>(() => createDraftAtom());

export type ReplyDraft = {
  userId: string;
  eventId: string;
};
const createReplyDraftAtom = () => atom<ReplyDraft | undefined>(undefined);
export type ReplyDraftAtom = ReturnType<typeof createReplyDraftAtom>;
export const composerToReplyDraftAtom = atomFamily<string, ReplyDraftAtom>(() =>
  createReplyDraftAtom()
);
