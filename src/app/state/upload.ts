import { atom, useAtom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { MatrixError } from 'neurone/lib/matrix-request';
import { postUpload, PostUploadOK } from 'neurone/lib/api/matrix/media/v3/upload';
import { useCallback } from 'react';
import { useThrottle } from '../hooks/useThrottle';
import { UploadContent } from '../utils/matrix';
import { getAuthUploadRequest, UploadProgress } from '../../client/request';
import { useClient } from '../hooks/useClient';

export enum UploadStatus {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

export type UploadIdle = {
  file: UploadContent;
  status: UploadStatus.Idle;
};

export type UploadLoading = {
  file: UploadContent;
  status: UploadStatus.Loading;
  abortController: AbortController;
  progress: UploadProgress;
};

export type UploadSuccess = {
  file: UploadContent;
  status: UploadStatus.Success;
  mxc: string;
};

export type UploadError = {
  file: UploadContent;
  status: UploadStatus.Error;
  error: MatrixError | Error;
};

export type Upload = UploadIdle | UploadLoading | UploadSuccess | UploadError;

export type UploadAtomAction =
  | {
      abortController: AbortController;
    }
  | {
      progress: UploadProgress;
    }
  | {
      mxc: string;
    }
  | {
      error: MatrixError | Error;
    };

export const createUploadAtom = (file: UploadContent) => {
  const baseUploadAtom = atom<Upload>({
    file,
    status: UploadStatus.Idle,
  });
  return atom<Upload, [UploadAtomAction], void>(
    (get) => get(baseUploadAtom),
    (get, set, update) => {
      const uploadState = get(baseUploadAtom);
      if ('abortController' in update) {
        set(baseUploadAtom, {
          status: UploadStatus.Loading,
          file,
          abortController: update.abortController,
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
export type UploadAtom = ReturnType<typeof createUploadAtom>;

export const useBindUploadAtom = (uploadAtom: UploadAtom, hideFilename?: boolean) => {
  const ct = useClient();
  const [upload, setUpload] = useAtom(uploadAtom);
  const { file } = upload;

  const handleProgress = useThrottle(
    useCallback((progress: UploadProgress) => setUpload({ progress }), [setUpload]),
    { immediate: true, wait: 200 }
  );

  const startUpload = useCallback(() => {
    const request = getAuthUploadRequest<PostUploadOK>(
      ct.session.baseUrl,
      ct.session.accessToken,
      handleProgress
    );
    const abortController = new AbortController();

    request(
      postUpload({
        searchParams: {
          filename: hideFilename ? undefined : file.name,
        },
        body: file,
      }),
      abortController.signal
    )
      .then(([error, data]) => {
        if (error) {
          setUpload({ error });
          return;
        }
        setUpload({ mxc: data.content_uri });
      })
      .catch((anyError) => {
        if (anyError instanceof Error) {
          setUpload({ error: anyError });
          return;
        }
        setUpload({ error: new Error('Unknown Error') });
      });

    setUpload({ abortController });
  }, [ct, file, hideFilename, setUpload, handleProgress]);

  const cancelUpload = useCallback(async () => {
    if (upload.status === UploadStatus.Loading) {
      upload.abortController.abort();
    }
  }, [upload]);

  return {
    upload,
    startUpload,
    cancelUpload,
  };
};

export const createUploadContentToUploadAtom = () =>
  atomFamily<UploadContent, UploadAtom>(createUploadAtom);

export const createUploadsAtom = (
  uploadFamily: ReturnType<typeof createUploadContentToUploadAtom>,
  uploads: UploadContent[]
) => atom<Upload[]>((get) => uploads.map((upload) => get(uploadFamily(upload))));
export type UploadsAtom = ReturnType<typeof createUploadsAtom>;
