import { RefObject, useCallback } from 'react';
import { useFileDropZone } from '../../../hooks/useFileDrop';
import { useFilePasteHandler } from '../../../hooks/useFilePasteHandler';
import { useFilePicker } from '../../../hooks/useFilePicker';
import { safeFile } from '../../../utils/mimeTypes';
import { UploadItem } from '../../../state/room/roomInputDrafts';
import { useRoom } from '../../../hooks/useRoom';
import { fulfilledPromiseSettledResult } from '../../../utils/common';
import { encryptFile } from '../../../utils/matrix';
import { useClient } from '../../../hooks/useClient';

export const useUploadItemPicker = (
  dropAreaRef: RefObject<HTMLElement>,
  onPick: (uploadItems: UploadItem[]) => void
) => {
  const ct = useClient();
  const roomId = useRoom();

  const handleFiles = useCallback(
    async (files: File[]) => {
      const safeFiles = files.map(safeFile);
      const uploadItems: UploadItem[] = [];

      if (ct.encryptedRooms.read.has(roomId)) {
        const encryptFiles = fulfilledPromiseSettledResult(
          await Promise.allSettled(safeFiles.map((f) => encryptFile(f)))
        );
        encryptFiles.forEach((ef) =>
          uploadItems.push({
            ...ef,
            metadata: {
              markedAsSpoiler: false,
            },
          })
        );
      } else {
        safeFiles.forEach((f) =>
          uploadItems.push({
            file: f,
            originalFile: f,
            encInfo: undefined,
            metadata: {
              markedAsSpoiler: false,
            },
          })
        );
      }
      onPick(uploadItems);
    },
    [roomId, ct, onPick]
  );

  const pickFile = useFilePicker(handleFiles, true);
  const handlePaste = useFilePasteHandler(handleFiles);
  const dropZoneVisible = useFileDropZone(dropAreaRef, handleFiles);

  return {
    pickFile,
    handlePaste,
    dropZoneVisible,
  };
};
