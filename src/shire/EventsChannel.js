import { setupCrossSigningWithPassphrase } from './CrossSigningSetup';
import { setupMessagesBackup } from './KeysBackup';

const crossSigningChannel = new BroadcastChannel('CrossSigningChannel');
const messageBackupChannel = new BroadcastChannel('MessageBackupChannel');
const shirePortalChannel = new BroadcastChannel('ShirePortalChannel');

function CrossSigningEventHandler() {
  crossSigningChannel.onmessage = async (event) => {
    const passPhrase = event.data.passphrase;
    try {
      await setupCrossSigningWithPassphrase(passPhrase);
      shirePortalChannel.postMessage({ type: "cross_signing_complete" });
    } catch (error) {
      console.log(error);
    }
  };
}

function MessagesBackupEventHandler() {
  messageBackupChannel.onmessage = async (event) => {
    try {
      await setupMessagesBackup();
      shirePortalChannel.postMessage({ type: "message_backup_complete" });
    } catch (error) {
      console.log(error);
    }
  };
}

export { CrossSigningEventHandler, MessagesBackupEventHandler, shirePortalChannel };
