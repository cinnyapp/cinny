import { setupCrossSigningWithPassphrase } from './CrossSigningSetup';
import { setupMessagesBackup } from './KeysBackup';

const crossSigningChannel = new BroadcastChannel('CrossSigningChannel');
const messageBackupChannel = new BroadcastChannel('MessageBackupChannel');

function CrossSigningEventHandler() {
  crossSigningChannel.onmessage = async (event) => {
    const passPhrase = event.data.passphrase;
    try {
      await setupCrossSigningWithPassphrase(passPhrase);
    } catch (error) {
      console.log(error);
    }
  };
}

function MessagesBackupEventHandler() {
  messageBackupChannel.onmessage = async (event) => {
    try {
      await setupMessagesBackup();
    } catch (error) {
      console.log(error);
    }
  };
}

export { CrossSigningEventHandler, MessagesBackupEventHandler };
