import { useCallback, DragEventHandler, RefObject, useState, useEffect, useRef } from 'react';
import { getDataTransferFiles } from '../utils/dom';

const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  pdf: 'application/pdf',
  txt: 'text/plain',
};

const mimeFromName = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MIME[ext] ?? 'application/octet-stream';
};

export const useFileDropHandler = (onDrop: (file: File[]) => void): DragEventHandler =>
  useCallback(
    (evt) => {
      const files = getDataTransferFiles(evt.dataTransfer);
      if (files) onDrop(files);
    },
    [onDrop]
  );

export const useFileDropZone = (
  zoneRef: RefObject<HTMLElement>,
  onDrop: (file: File[]) => void
): boolean => {
  const dragStateRef = useRef<'start' | 'leave' | 'over'>();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const target = zoneRef.current;
    const handleDrop = (evt: DragEvent) => {
      evt.preventDefault();
      dragStateRef.current = undefined;
      setActive(false);
      if (!evt.dataTransfer) return;
      const files = getDataTransferFiles(evt.dataTransfer);
      if (files) onDrop(files);
    };

    target?.addEventListener('drop', handleDrop);
    return () => {
      target?.removeEventListener('drop', handleDrop);
    };
  }, [zoneRef, onDrop]);

  useEffect(() => {
    const target = zoneRef.current;
    const handleDragEnter = (evt: DragEvent) => {
      if (evt.dataTransfer?.types.includes('Files')) {
        dragStateRef.current = 'start';
        setActive(true);
      }
    };
    const handleDragLeave = () => {
      if (dragStateRef.current !== 'over') return;
      dragStateRef.current = 'leave';
      // This leave fires while the cursor is still inside the room, (Tauri, Linux)
      if ('__TAURI_INTERNALS__' in window) return;
      setActive(false);
    };
    const handleDragOver = (evt: DragEvent) => {
      evt.preventDefault();
      dragStateRef.current = 'over';
    };

    target?.addEventListener('dragenter', handleDragEnter);
    target?.addEventListener('dragleave', handleDragLeave);
    target?.addEventListener('dragover', handleDragOver);
    return () => {
      target?.removeEventListener('dragenter', handleDragEnter);
      target?.removeEventListener('dragleave', handleDragLeave);
      target?.removeEventListener('dragover', handleDragOver);
    };
  }, [zoneRef]);

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return undefined;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const listen = async () => {
      // Just for tauri!
      // eslint-disable-next-line import/no-extraneous-dependencies
      const { getCurrentWebview } = await import('@tauri-apps/api/webview');
      // eslint-disable-next-line import/no-extraneous-dependencies
      const { readFile } = await import('@tauri-apps/plugin-fs');
      if (cancelled) return;

      // On the drag drop event:
      unlisten = await getCurrentWebview().onDragDropEvent((event) => {
        // If we're entering..
        if (event.payload.type === 'enter') {
          setActive(true); // ..show the drop zone.
          return;
        }
        // If we're leaving..
        if (event.payload.type === 'leave') {
          setActive(false); // ..hide the drop zone.
          return;
        }
        // If we're not dropping..
        if (event.payload.type !== 'drop') return; // ..return.

        setActive(false); // Hide the drop zone, then..
        const { paths } = event.payload; // ..get the paths from the payload.
        Promise.all(
          paths.map(async (path) => {
            const bytes = await readFile(path); // Read, then..
            const name = path.split(/[/\\]/).pop() || 'file';
            return new File([bytes], name, { type: mimeFromName(name) }); // ..return a File.
          })
        )
          .then((files) => {
            if (files.length > 0) onDrop(files);
          })
          .catch((error: unknown) => {
            // eslint-disable-next-line no-console
            console.error('[cinny] file drop failed', error);
          });
      });
    };

    listen().catch(() => undefined);

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [onDrop]);

  return active;
};
