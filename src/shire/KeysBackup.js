import initMatrix from '../client/initMatrix';
import { deletePrivateKey } from '../client/state/secretStorageKeys';

const setupMessagesBackup = async () => {
    const mx = initMatrix.matrixClient;

    const backupInfo = await mx.getKeyBackupVersion();

    if (backupInfo === null)
        await createBackup();
    else {
        await restoreBackup();
        await deleteBackup();
        await createBackup();
    }
}

const restoreBackup = async () => {
    const mx = initMatrix.matrixClient;

    let meBreath = true;
    const progressCallback = (progress) => {
        if (!progress.successes) return;
        if (meBreath === false) return;
        meBreath = false;
        setTimeout(() => {
            meBreath = true;
        }, 200);
        console.log(`Restoring backup keys... (${progress.successes}/${progress.total})`);
    };

    try {
        const backupInfo = await mx.getKeyBackupVersion();
        const info = await mx.restoreKeyBackupWithSecretStorage(
            backupInfo,
            undefined,
            undefined,
            { progressCallback },
        );
        console.log(`Successfully restored backup keys (${info.imported}/${info.total}).`);
    } catch (e) {
        if (e.errcode === 'RESTORE_BACKUP_ERROR_BAD_KEY') {
            deletePrivateKey(keyData.keyId);
            console.log('Failed to restore backup. Key is invalid!');
        } else {
            console.log('Failed to restore backup.');
            console.log(e);
        }
    }
};

const deleteBackup = async () => {
    const mx = initMatrix.matrixClient;
    try {
        const backupInfo = await mx.getKeyBackupVersion();
        if (backupInfo) await mx.deleteKeyBackupVersion(backupInfo.version);
    } catch (e) {
        console.log("Failed to delete messages backup", "error:", e);
        console.log("Error:", e);
    }
};

const createBackup = async () => {
    const mx = initMatrix.matrixClient;
    let info;

    try {
        info = await mx.prepareKeyBackupVersion(
            null,
            { secureSecretStorage: true },
        );
        info = await mx.createKeyBackupVersion(info);
        await mx.scheduleAllGroupSessionsForBackup();
    } catch (e) {
        console.log(e);
        deletePrivateKey(keyData.keyId);
        await mx.deleteKeyBackupVersion(info.version);
    }
};

export { setupMessagesBackup }