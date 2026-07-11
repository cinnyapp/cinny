import { useCallback, DragEventHandler, RefObject, useState, useEffect } from 'react';
import { getDataTransferFiles } from '../utils/dom';

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
  const [active, setActive] = useState(false);

  useEffect(() => {
    const target = zoneRef.current;
    const handleDrop = (evt: DragEvent) => {
      evt.preventDefault();
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
        setActive(true);
      }
    };
    const handleDragLeave = (evt: DragEvent) => {
      // relatedTarget is the element being entered, null when leaving the window.
      const enteredNode = evt.relatedTarget as Node | null;
      if (!enteredNode || !target?.contains(enteredNode)) setActive(false);
    };
    const handleDragOver = (evt: DragEvent) => {
      evt.preventDefault();
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

  return active;
};
