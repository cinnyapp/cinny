import initMatrix from '../client/initMatrix';
import { encryptMegolmKeyFile, decryptMegolmKeyFile } from '../util/cryptE2ERoomKeys';

async function getE2ERoomKeys(encrpytionPassword) {
  try {
    const keys = await initMatrix.matrixClient.exportRoomKeys();
    // TODO ShireApp: change the password parameter with a proper secret key
    // for encryption or just export the keys
    console.log('########## keys before encryption');
    console.log(keys);
    console.log(JSON.stringify(keys));
    const encKeys = await encryptMegolmKeyFile(
      JSON.stringify(keys),
      encrpytionPassword,
    );
    console.log('########## keys after encryption');
    console.log(encKeys);
    return encKeys;
  } catch (e) {
    // TODO fill in the catch function
    return 'Exporting E2EE keys process failed';
  }
}

async function importE2EERoomKeys(encryptedKeys, encrpytionPassword) {
  try {
    console.log('############### Started E2EE keys decryption process ############');
    console.log(encryptedKeys);
    const keys = await decryptMegolmKeyFile(encryptedKeys, encrpytionPassword);
    console.log('############### after decrypt ############');
    console.log(keys);
    console.log(JSON.parse(keys));
    await initMatrix.matrixClient.importRoomKeys(JSON.parse(keys));
    return keys;
  } catch (e) {
    // TODO fill in the catch function
    return 'Importing E2EE keys process failed';
  }
}

export { importE2EERoomKeys, getE2ERoomKeys };
