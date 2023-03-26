import initMatrix from '../client/initMatrix';
import { deletePrivateKey } from '../client/state/secretStorageKeys';

// TODO: helper functions for cross signing
const restoreBackup = async () => {
    const mx = initMatrix.matrixClient;
    // setStatus(false);

    console.log("restore triggered");
    let meBreath = true;
    const progressCallback = (progress) => {
        if (!progress.successes) return;
        if (meBreath === false) return;
        meBreath = false;
        setTimeout(() => {
            meBreath = true;
        }, 200);

        // setStatus({ message: `Restoring backup keys... (${progress.successes}/${progress.total})` });
        console.log(`Restoring backup keys... (${progress.successes}/${progress.total})`);
    };

    try {
        const backupInfo = await mx.getKeyBackupVersion();
        console.log("######### backup info");
        console.log(backupInfo);
        const info = await mx.restoreKeyBackupWithSecretStorage(
            backupInfo,
            undefined,
            undefined,
            { progressCallback },
        );
        console.log("info after restoring");
        console.log(info);
        // if (!mountStore.getItem()) return;
        // setStatus({ done: `Successfully restored backup keys (${info.imported}/${info.total}).` });
        console.log(`Successfully restored backup keys (${info.imported}/${info.total}).`);
    } catch (e) {
        // if (!mountStore.getItem()) return;
        if (e.errcode === 'RESTORE_BACKUP_ERROR_BAD_KEY') {
            deletePrivateKey(keyData.keyId);
            // setStatus({ error: 'Failed to restore backup. Key is invalid!', errorCode: 'BAD_KEY' });
            console.log('Failed to restore backup. Key is invalid!');
        } else {
            // setStatus({ error: 'Failed to restore backup.', errCode: 'UNKNOWN' });
            console.log('Failed to restore backup.');
            console.log(e);
        }
    }
};

//TODO this where delete backup lives
const deleteBackup = async () => {
    const mx = initMatrix.matrixClient;
    // mountStore.setItem(true);
    // setIsDeleting(true);
    try {
        const backupInfo = await mx.getKeyBackupVersion();
        if (backupInfo) await mx.deleteKeyBackupVersion(backupInfo.version);
        // if (!mountStore.getItem()) return;
        // requestClose(true);
    } catch (e) {
        // if (!mountStore.getItem()) return;
        // setIsDeleting(false);
        console.log("Failed to delete backup", "error:", e);
        console.log("Error:", e);
    }
};

const createBackup = async () => {
    const mx = initMatrix.matrixClient;
    // setDone(false);
    let info;

    try {
        info = await mx.prepareKeyBackupVersion(
            null,
            { secureSecretStorage: true },
        );
        info = await mx.createKeyBackupVersion(info);
        await mx.scheduleAllGroupSessionsForBackup();
        // if (!mountStore.getItem()) return;
        // setDone(true);
    } catch (e) {
        console.log(e);
        deletePrivateKey(keyData.keyId);
        await mx.deleteKeyBackupVersion(info.version);
        // if (!mountStore.getItem()) return;
        // setDone(null);
    }
};

export { restoreBackup, deleteBackup, createBackup as downloadBackup }