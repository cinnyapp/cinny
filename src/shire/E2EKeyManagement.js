import initMatrix from '../client/initMatrix';
import { encryptMegolmKeyFile, decryptMegolmKeyFile } from '../util/cryptE2ERoomKeys';

async function getE2ERoomKeys() {
  try {
    const keys = await initMatrix.matrixClient.exportRoomKeys();
    // TODO ShireApp: change the password parameter with a proper secret key
    // for encryption or just export the keys
    const encKeys = await encryptMegolmKeyFile(JSON.stringify(keys), 'root');
    console.log('########## keys before encryption');
    console.log(keys);
    console.log(JSON.stringify(keys));

    console.log('########## keys after encryption');
    console.log(encKeys);
    console.log(encKeys.toString());
    return encKeys;
  } catch (e) {
    // TODO fill in the catch function
    return 'error';
  }
}

async function importE2EERoomKeys(file, password) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const keys = await decryptMegolmKeyFile(arrayBuffer, password);
    console.log(keys);
    console.log(JSON.parse(keys));
    await initMatrix.matrixClient.importRoomKeys(JSON.parse(keys));
    return keys;
  } catch (e) {
    // TODO fill in the catch function
    return 'error';
  }
}

export default getE2ERoomKeys;
