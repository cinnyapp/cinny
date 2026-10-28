import { useCallback } from 'react';
import { atom, useSetAtom } from 'jotai';

export const TOAST_DURATION_MS = 4000;

export type ToastVariant = 'Success' | 'Critical';
export type Toast = { id: number; message: string; variant: ToastVariant };

export const toastsAtom = atom<Toast[]>([]);

let nextId = 0;

export const addToast = (toasts: Toast[], message: string, variant: ToastVariant): Toast[] => {
  nextId += 1;
  return [...toasts, { id: nextId, message, variant }];
};

export const removeToast = (toasts: Toast[], id: number): Toast[] =>
  toasts.filter((toast) => toast.id !== id);

// Shows a short message at the bottom of the screen; <Toaster /> renders and dismisses it.
export const useToast = () => {
  const setToasts = useSetAtom(toastsAtom);
  return useCallback(
    (message: string, variant: ToastVariant = 'Success') =>
      setToasts((toasts) => addToast(toasts, message, variant)),
    [setToasts]
  );
};
