import SetupCrossSigningUsingPassPhrase from './CrossSigningSetup';

function InitAuthBroadcastChannel() {
  const crossSigningChannel = new BroadcastChannel('CrossSigningChannel');
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

const encryptionKeysImportChannel = new BroadcastChannel('EncryptionImport');

const encryptionKeysExportChannel = new BroadcastChannel('EncryptionExport');

export default InitAuthBroadcastChannel;
