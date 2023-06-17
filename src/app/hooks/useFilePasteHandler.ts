import { useCallback, ClipboardEventHandler } from 'react';
import { getDataTransferFiles } from '../utils/dom';

export const useFilePasteHandler = (onPaste: (file: File[]) => void): ClipboardEventHandler =>
  useCallback(
    (evt) => {
      const files = getDataTransferFiles(evt.clipboardData);
      if (files) onPaste(files);
    },
    [onPaste]
  );
