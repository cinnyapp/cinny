import SetupCrossSigningUsingPassPhrase from './CrossSigningSetup';

const crossSigningChannel = new BroadcastChannel('CrossSigningChannel');
const encryptionKeysImportChannel = new BroadcastChannel('EncryptionImport');
const encryptionKeysExportChannel = new BroadcastChannel('EncryptionExport');

function handleCrossSigningEventsChannel() {
  crossSigningChannel.onmessage = async (event) => {
    console.log('Cross Signing Event Handler Triggered');
    const passPhrase = event.data.passphrase;
    console.log('Pass phrase is:', passPhrase);
    try {
      await SetupCrossSigningUsingPassPhrase(passPhrase);
      console.log('#######################');
      console.log('Verification Successful');
    } catch (error) {
      console.log('Verification Failed Error Occured');
      console.log(error);
    }
  };
}

function handleEncryptionKeysImportEvent() {
  encryptionKeysImportChannel.onmessage = async (event) => {
    console.log('E2EE Import Event Handler Triggered');
    try {
      // TODO add import logic
    } catch (error) {
      console.log('E2EE Import Failed Error Occured');
      console.log(error);
    }
  };
}

function handleEncryptionKeysExportEvent() {
  encryptionKeysExportChannel.onmessage = async (event) => {
    console.log('E2EE Export Event Handler Triggered');
    try {
      // TODO add export logic
    } catch (error) {
      console.log('E2EE Export Failed Error Occured');
      console.log(error);
    }
  };
}

export {
  handleCrossSigningEventsChannel,
  handleEncryptionKeysExportEvent,
  handleEncryptionKeysImportEvent,
};
