import { useCallback, ClipboardEventHandler } from 'react';
import { getDataTransferFiles } from '../utils/dom';
import {invoke} from '@tauri-apps/api';

function base64ToFile(base64: string, filename: string, type: string): File {
  const binary = atob(base64)
  let n = binary.length
  const u8arr = new Uint8Array(n);
  while(n--){
    u8arr[n] = binary.charCodeAt(n);
  }
  return new File([u8arr], filename, {type});
}

export const useFilePasteHandler = (onPaste: (file: File[]) => void): ClipboardEventHandler =>
  useCallback(
    async (evt) => {
      if (window.__TAURI__) {
        try {
          const result: string = await invoke("clipboard_read_image");
          const file = base64ToFile(result, 'image.webp', 'image/webp');
          evt.preventDefault();
          onPaste([file]);
        } catch(e) {

        }
      } else {
        const files = getDataTransferFiles(evt.clipboardData);
        if (files) onPaste(files);
      }
    },
    [onPaste]
  );
