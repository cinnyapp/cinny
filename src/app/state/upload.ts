import { atom, useAtom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { MatrixClient, UploadResponse, UploadProgress, MatrixError } from 'matrix-js-sdk';
import { useCallback } from 'react';
import { useThrottle } from '../hooks/useThrottle';
import { uploadContent, TUploadContent } from '../utils/matrix';

export enum UploadStatus {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

export type UploadIdle = {
  file: TUploadContent;
  status: UploadStatus.Idle;
};

export type UploadLoading = {
  file: TUploadContent;
  status: UploadStatus.Loading;
  promise: Promise<UploadResponse>;
  progress: UploadProgress;
};

export type UploadSuccess = {
  file: TUploadContent;
  status: UploadStatus.Success;
  mxc: string;
};

export type UploadError = {
  file: TUploadContent;
  status: UploadStatus.Error;
  error: MatrixError;
};

export type Upload = UploadIdle | UploadLoading | UploadSuccess | UploadError;

export type UploadAtomAction =
  | {
      promise: Promise<UploadResponse>;
    }
  | {
      progress: UploadProgress;
    }
  | {
      mxc: string;
    }
  | {
      error: MatrixError;
    };

export const createUploadAtom = (file: TUploadContent) => {
  const baseUploadAtom = atom<Upload>({
    file,
    status: UploadStatus.Idle,
  });
  return atom<Upload, UploadAtomAction>(
    (get) => get(baseUploadAtom),
    (get, set, update) => {
      const uploadState = get(baseUploadAtom);
      if ('promise' in update) {
        set(baseUploadAtom, {
          status: UploadStatus.Loading,
          file,
          promise: update.promise,
          progress: { loaded: 0, total: file.size },
        });
        return;
      }
      if ('progress' in update && uploadState.status === UploadStatus.Loading) {
        set(baseUploadAtom, {
          ...uploadState,
          progress: update.progress,
        });
        return;
      }
      if ('mxc' in update) {
        set(baseUploadAtom, {
          status: UploadStatus.Success,
          file,
          mxc: update.mxc,
        });
        return;
      }
      if ('error' in update) {
        set(baseUploadAtom, {
          status: UploadStatus.Error,
          file,
          error: update.error,
        });
      }
    }
  );
};
export type TUploadAtom = ReturnType<typeof createUploadAtom>;

export const useBindUploadAtom = (
  mx: MatrixClient,
  file: TUploadContent,
  uploadAtom: TUploadAtom,
  hideFilename?: boolean
) => {
  const [upload, setUpload] = useAtom(uploadAtom);

  const handleProgress = useThrottle(
    useCallback((progress: UploadProgress) => setUpload({ progress }), [setUpload]),
    { immediate: true, wait: 200 }
  );

  const startUpload = useCallback(
    () =>
      uploadContent(mx, file, {
        hideFilename,
        onPromise: (promise: Promise<UploadResponse>) => setUpload({ promise }),
        onProgress: handleProgress,
        onSuccess: (mxc) => setUpload({ mxc }),
        onError: (error) => setUpload({ error }),
      }),
    [mx, file, hideFilename, setUpload, handleProgress]
  );

  const cancelUpload = useCallback(async () => {
    if (upload.status === UploadStatus.Loading) {
      await mx.cancelUpload(upload.promise);
    }
  }, [mx, upload]);

  return {
    upload,
    startUpload,
    cancelUpload,
  };
};

export const createUploadAtomFamily = () =>
  atomFamily<TUploadContent, TUploadAtom>(createUploadAtom);
export type TUploadAtomFamily = ReturnType<typeof createUploadAtomFamily>;

export const createUploadFamilyObserverAtom = (
  uploadFamily: TUploadAtomFamily,
  uploads: TUploadContent[]
) => atom<Upload[]>((get) => uploads.map((upload) => get(uploadFamily(upload))));
export type TUploadFamilyObserverAtom = ReturnType<typeof createUploadFamilyObserverAtom>;
