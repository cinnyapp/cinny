import {
  MatrixError,
  MatrixRequest,
  MatrixResponseResult,
  parseMatrixResp,
} from 'neurone/lib/matrix-request';
import { getSync, GetSyncOK } from 'neurone/lib/api/matrix/client/v3/sync';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { ProgressCallback, responseProgress } from './responseProgress';
import { getInitialSyncFilter, getSyncFilter } from './filter';

type SyncError = Error | MatrixError;

export type SyncValue = [SyncError, undefined] | [undefined, GetSyncOK] | undefined;

export type SyncCallback = (
  since: string | undefined,
  progressCallback?: ProgressCallback
) => Promise<void>;

export const createSync = (request: MatrixRequest): [ObservableValue<SyncValue>, SyncCallback] => {
  const abortController = new AbortController();
  const abortSignal = abortController.signal;

  const initialSyncFilter = JSON.stringify(getInitialSyncFilter());
  const syncFilter = JSON.stringify(getSyncFilter());

  const publisherKey = Math.random().toString();
  const syncObservable = new ObservableValue<SyncValue>(undefined, publisherKey);

  const sync: SyncCallback = async (since, progressCallback) => {
    if (syncObservable.read !== undefined) {
      syncObservable.publish(publisherKey, undefined);
    }

    const responsePromise = request(
      getSync({
        searchParams: {
          filter: since ? syncFilter : initialSyncFilter,
          full_state: false,
          timeout: 30000,
          since,
        },
      }),
      abortSignal
    );

    let response: Response;
    try {
      response = await responsePromise;
    } catch (err: any) {
      if (!abortSignal.aborted) {
        syncObservable.publish(publisherKey, [err, undefined]);
      }
      return;
    }

    if (progressCallback) {
      responseProgress(response.clone(), progressCallback);
    }

    let result: MatrixResponseResult<GetSyncOK>;
    try {
      result = await parseMatrixResp<GetSyncOK>(response);
    } catch (err: any) {
      syncObservable.publish(publisherKey, [err, undefined]);
      return;
    }

    const [matrixError, data] = result;

    if (matrixError) {
      syncObservable.publish(publisherKey, [matrixError, undefined]);
      return;
    }

    syncObservable.publish(publisherKey, [undefined, data]);
  };

  syncObservable.onDispose(publisherKey, () => {
    abortController.abort();
  });

  return [syncObservable, sync];
};

export type SyncProgress = {
  received: number;
  total?: number;
};

type InitialSyncObservable = ObservableValue<
  | {
      progress: ObservableValue<SyncProgress | undefined>;
    }
  | undefined
>;

export type SyncController = {
  initialSync: InitialSyncObservable;
  start: () => void;
  recover: (afterMs?: number) => void;
  dispose: () => void;
};

export const createSyncController = (
  syncObservable: ObservableValue<SyncValue>,
  sync: SyncCallback,
  getSyncToken: () => string | undefined
): [SyncController, () => void, (since: string) => void] => {
  let started = false;

  const progressPublisherKey = 'PROGRESS_KEY';
  const progress: ObservableValue<SyncProgress | undefined> = new ObservableValue(
    undefined,
    progressPublisherKey
  );

  const initialSyncPublisherKey = 'SYNC_KEY';
  const initialSync: InitialSyncObservable = new ObservableValue(
    getSyncToken() ? undefined : { progress },
    initialSyncPublisherKey
  );

  const handleInitialSyncProgress: ProgressCallback = (received, total) => {
    if (progress.isDisposed) return;
    progress.publish(progressPublisherKey, {
      received,
      total,
    });
  };

  const doSync = async () => {
    const token = getSyncToken();
    await sync(token, token ? undefined : handleInitialSyncProgress);
  };

  const syncController: SyncController = {
    initialSync,
    start: () => {
      if (started) {
        console.warn('Can not start the sync controller twice. Use recover method for recovery.');
        return;
      }
      started = true;
      doSync();
    },
    recover: () => {
      const [error] = syncObservable.read ?? [];
      if (!error) {
        console.warn('Failed to recover. Sync does not have any error.');
        return;
      }
      doSync();
    },
    dispose: () => {
      initialSync.dispose();
    },
  };

  const onWriteComplete = () => {
    if (initialSync.read) {
      initialSync.publish(initialSyncPublisherKey, undefined);
    }
  };

  const onSyncToken = (token: string) => {
    sync(token);
  };

  return [syncController, onWriteComplete, onSyncToken];
};

export type SyncContext = {
  observable: ObservableValue<SyncValue>;
  controller: SyncController;
};
