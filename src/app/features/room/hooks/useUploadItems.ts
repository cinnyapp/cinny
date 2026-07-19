import { useAtom } from 'jotai';
import { useCallback } from 'react';
import {
  composerToUploadItemsAtom,
  getComposerId,
  roomUploadContentToUploadAtom,
  UploadItem,
  UploadMetadata,
} from '../../../state/room/roomInputDrafts';
import { useRoom } from '../../../hooks/useRoom';
import { UploadContent } from '../../../utils/matrix';
import { Upload, UploadStatus } from '../../../state/upload';

export const useUploadItems = (threadId?: string) => {
  const roomId = useRoom();
  const [uploadItems, setUploadItems] = useAtom(
    composerToUploadItemsAtom(getComposerId(roomId, threadId))
  );

  const updateUploadMetadata = useCallback(
    (item: UploadItem, metadata: UploadMetadata) => {
      setUploadItems({
        type: 'REPLACE',
        item,
        replacement: { ...item, metadata },
      });
    },
    [setUploadItems]
  );

  const removeUploadItem = useCallback(
    (fileOrFiles: UploadContent | UploadContent[]) => {
      const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
      setUploadItems({
        type: 'DELETE',
        item: uploadItems.filter((i) => files.find((f) => f === i.file)),
      });
      files.forEach((f) => roomUploadContentToUploadAtom.remove(f));
    },
    [uploadItems, setUploadItems]
  );

  const addUploadItems = useCallback(
    (items: UploadItem[]) => {
      setUploadItems({
        type: 'PUT',
        item: items,
      });
    },
    [setUploadItems]
  );

  const dropUploads = (uploads: Upload[]) => {
    uploads.forEach((upload) => {
      if (upload.status === UploadStatus.Loading) {
        upload.abortController.abort();
      }
    });
    removeUploadItem(uploads.map((upload) => upload.file));
  };

  return {
    uploadItems,
    addUploadItems,
    removeUploadItem,
    updateUploadMetadata,
    dropUploads,
  };
};
