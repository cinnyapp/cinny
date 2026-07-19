import { useMemo } from 'react';
import { roomUploadContentToUploadAtom, UploadItem } from '../../../state/room/roomInputDrafts';
import { createUploadsAtom } from '../../../state/upload';

export const useUploadsAtom = (uploadItems: UploadItem[]) => {
  const uploadsAtom = useMemo(
    () =>
      createUploadsAtom(
        roomUploadContentToUploadAtom,
        uploadItems.map((f) => f.file)
      ),
    [uploadItems]
  );

  return uploadsAtom;
};
