import { getKeys, GetKeysOK, PutKeysOK } from 'neurone/lib/api/matrix/client/v3/roomKeys';
import { BackupVersionInfo } from 'neurone/lib/api/types';
import { Machine } from 'neurone/lib/crypto/machine';
import { KeyBackup, RoomKeysImportResult } from 'neurone/lib/crypto/machine/backup';
import { MatrixError, MatrixRequest, parseMatrixResp } from 'neurone/lib/matrix-request';
import { Base64 } from 'neurone/lib/utils';
import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { ProgressCallback, responseProgress } from './responseProgress';

export type ImportBackupIdle = {
  type: 'idle';
};
export type ImportBackupDownload = {
  type: 'download';
  receivedBytes: number;
  totalBytes?: number;
};
export type ImportBackupImport = {
  type: 'import';
  progress?: {
    imported: number;
    total: number;
    failures: number;
  };
};
export type ImportBackupDone = {
  type: 'done';
  result: RoomKeysImportResult;
};
export type ImportBackupError = {
  type: 'error';
  error: MatrixError;
};

export type BackupRestoreState =
  | ImportBackupIdle
  | ImportBackupDownload
  | ImportBackupImport
  | ImportBackupDone
  | ImportBackupError;

export class MegolmBackup implements Disposable {
  private readonly disposer = new Disposer();

  private readonly publishKey = crypto.randomUUID();

  public readonly keyBackup: ObservableValue<KeyBackup | undefined>;

  public readonly restoreState: ObservableValue<BackupRestoreState>;

  public readonly backupInProgress: ObservableValue<boolean>;

  constructor(
    private readonly machine: Machine,
    private readonly request: MatrixRequest,
    private readonly backupInfo: ObservableValue<BackupVersionInfo | undefined>
  ) {
    this.keyBackup = new ObservableValue(undefined, this.publishKey);
    this.restoreState = new ObservableValue({ type: 'idle' }, this.publishKey);
    this.backupInProgress = new ObservableValue(false, this.publishKey);

    this.handleBackupInfo(this.backupInfo.read);

    this.disposer.collect(
      this.backupInfo.subscribe(this.handleBackupInfo.bind(this)),

      this.machine.events.onReceiveSecret.subscribe(({ name, value }) => {
        if (name !== 'm.megolm_backup.v1') return;
        this.saveDecryptionKey(value);
      }),

      this.machine.events.onRoomKeysUpdated.subscribe(() => {
        const keyBackup = this.keyBackup.read;
        if (keyBackup) {
          this.backup(keyBackup);
        }
      })
    );
  }

  private async handleBackupInfo(backupInfo?: BackupVersionInfo): Promise<void> {
    const prevBackup = this.keyBackup.read?.backupInfo;

    const backupRemoved = !backupInfo && prevBackup !== undefined;
    if (backupRemoved) {
      await this.machine.backupManager.disableBackup();
      this.keyBackup.publish(this.publishKey, undefined);
      return;
    }

    if (!backupInfo) return;

    const versionChanged = prevBackup && prevBackup.version !== backupInfo.version;
    if (versionChanged && this.keyBackup.read) {
      this.machine.backupManager.disableBackup();
    }

    this.start(backupInfo);
  }

  public async saveDecryptionKey(secret: string): Promise<void> {
    const backupInfo = this.backupInfo.read;
    if (!backupInfo) {
      throw new Error(
        'Cannot save the backup recovery key because no backup version is configured.'
      );
    }

    await this.machine.backupManager.saveDecryptionKey(Base64.decode(secret), this.backupInfo.read);

    const keyBackup = this.keyBackup.read ?? (await this.start(backupInfo));

    this.restore(keyBackup);
  }

  private async start(backupInfo: BackupVersionInfo): Promise<KeyBackup> {
    const trusted = await this.machine.backupManager.trustedBackup(backupInfo);
    if (!trusted) {
      throw new Error(
        'Cannot start key backup because the provided backup version is not trusted.'
      );
    }

    const keyBackup = await this.machine.backupManager.enableBackup(backupInfo);
    this.keyBackup.publish(this.publishKey, keyBackup);

    this.backup(keyBackup);

    return keyBackup;
  }

  private async backup(keyBackup: KeyBackup): Promise<void> {
    if (this.backupInProgress.read) {
      return;
    }

    this.backupInProgress.publish(this.publishKey, true);

    try {
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const req = await keyBackup.backupRoomKeys();

        // No more keys to back up.
        if (!req) break;

        // eslint-disable-next-line no-await-in-loop
        const [err, result] = await parseMatrixResp<PutKeysOK>(req.response);

        if (err) throw new Error(err.data.error ?? err.data.errcode);

        console.debug(`Backed up ${result.count} room keys`);
      }
    } catch (e) {
      console.error('Backup keys request failed!', e);
    } finally {
      this.backupInProgress.publish(this.publishKey, false);
    }
  }

  public async restore(keyBackup: KeyBackup): Promise<void> {
    this.restoreState.publish(this.publishKey, {
      type: 'download',
      receivedBytes: 0,
    });
    const resp = await this.request(
      getKeys({ searchParams: { version: keyBackup.backupInfo.version } })
    );

    const handleDownloadProgress: ProgressCallback = (receivedBytes, totalBytes) => {
      this.restoreState.publish(this.publishKey, {
        type: 'download',
        receivedBytes,
        totalBytes,
      });
    };
    await responseProgress(resp.clone(), handleDownloadProgress);

    const [error, result] = await parseMatrixResp<GetKeysOK>(resp);
    if (error) {
      this.restoreState.publish(this.publishKey, {
        type: 'error',
        error,
      });
      return;
    }

    this.restoreState.publish(this.publishKey, { type: 'import' });
    const handleImportProgress = (imported: bigint, total: bigint, failures: bigint) => {
      this.restoreState.publish(this.publishKey, {
        type: 'import',
        progress: {
          imported: Number(imported),
          total: Number(total),
          failures: Number(failures),
        },
      });
    };

    const importResult = await keyBackup.importBackup(result.rooms, handleImportProgress);
    this.restoreState.publish(this.publishKey, {
      type: 'done',
      result: importResult,
    });
  }

  dispose(): void {
    this.disposer.run();
  }
}
