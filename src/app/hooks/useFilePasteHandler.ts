import { useCallback, ClipboardEventHandler } from 'react';
import { getDataTransferFiles } from '../utils/dom';

const imageFilesFromClipboard = (items: ClipboardItems): Promise<File[]> =>
  Promise.all(
    items.map(async (item) => {
      const type = item.types.find((entry) => entry.startsWith('image/')); // has to be an image too,
      if (!type) return undefined;
      const blob = await item.getType(type);
      const ext = type.split('/')[1]?.split('+')[0] || 'bin';
      return new File([blob], `clipboard.${ext}`, { type });
    })
  ).then((files) => files.filter((file): file is File => file !== undefined));

export const useFilePasteHandler = (onPaste: (file: File[]) => void): ClipboardEventHandler =>
  useCallback(
    (evt) => {
      const files = getDataTransferFiles(evt.clipboardData);
      if (files) {
        evt.preventDefault(); // Prevent the default paste behavior
        onPaste(files);
        return;
      }

      // If there are types or the clipboard is NOT readable, return.
      if (evt.clipboardData.types.length > 0 || !navigator.clipboard?.read) return;

      evt.preventDefault(); // Prevent the default paste behavior
      navigator.clipboard
        .read()
        .then(imageFilesFromClipboard) // Get the image files from the clipboard
        .then((images) => { // If there are images, paste them.
          if (images.length > 0) onPaste(images);
        }) // If there are no images, return.
        .catch(() => undefined); // If there is an error, return.
    },
    [onPaste]
  );
