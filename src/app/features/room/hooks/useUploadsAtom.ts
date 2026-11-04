// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

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
